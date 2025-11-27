import { ChildProcess } from 'child_process';
import * as path from 'path';
import { InspectorClient } from './inspector-client';
import { spawnWithInspector } from './process-spawner';
import { BreakpointManager } from './breakpoint-manager';
import { CdpBreakpointOperations } from './cdp-breakpoint-operations';
import {
  VariableInspector,
  EvaluationResult,
  PropertyDescriptor,
} from './variable-inspector';
import { SourceMapManager } from './source-map-manager';

/**
 * Breakpoint definition stored in a debug session
 */
export interface Breakpoint {
  id: string;
  file: string;
  line: number;
  condition?: string;
  enabled: boolean;
  cdpBreakpointId?: string;
}

/**
 * Watched variable definition
 */
export interface WatchedVariable {
  name: string;
  expression: string;
  lastValue?: any;
}

/**
 * Stack frame information
 */
export interface StackFrame {
  functionName: string;
  file: string;
  line: number;
  column: number;
  callFrameId: string;
}

/**
 * Debug session state
 */
export enum SessionState {
  STARTING = 'starting',
  PAUSED = 'paused',
  RUNNING = 'running',
  TERMINATED = 'terminated',
}

/**
 * Configuration for starting a debug session
 */
export interface DebugSessionConfig {
  command: string;
  args?: string[];
  cwd?: string;
  timeout?: number;
}

/**
 * Represents a single debug session with a target process
 * Tracks session state, breakpoints, and watched variables
 */
export class DebugSession {
  public readonly id: string;
  private process: ChildProcess | null = null;
  private inspector: InspectorClient | null = null;
  private state: SessionState = SessionState.STARTING;
  private breakpointManager: BreakpointManager;
  private cdpBreakpointOps: CdpBreakpointOperations | null = null;
  private variableInspector: VariableInspector | null = null;
  private sourceMapManager: SourceMapManager;
  private watchedVariables = new Map<string, WatchedVariable>();
  private watchedVariableChanges = new Map<
    string,
    { oldValue: any; newValue: any }
  >();
  private config: DebugSessionConfig;
  private currentCallFrames: any[] = [];
  private currentFrameIndex: number = 0;
  private crashHandlers: Array<(error: Error) => void> = [];
  private crashError?: Error;

  constructor(id: string, config: DebugSessionConfig) {
    this.id = id;
    this.config = config;
    this.breakpointManager = new BreakpointManager();
    this.sourceMapManager = new SourceMapManager();
  }

  /**
   * Start the debug session by spawning the process and connecting the inspector
   */
  async start(): Promise<void> {
    if (this.state !== SessionState.STARTING) {
      throw new Error(`Cannot start session in state: ${this.state}`);
    }

    try {
      // Spawn process with inspector
      const { process: proc, wsUrl } = await spawnWithInspector(
        this.config.command,
        this.config.args || [],
        this.config.cwd,
      );

      this.process = proc;

      // Connect inspector client
      this.inspector = new InspectorClient(wsUrl);
      await this.inspector.connect();

      // Initialize CDP breakpoint operations
      this.cdpBreakpointOps = new CdpBreakpointOperations(this.inspector);

      // Initialize variable inspector
      this.variableInspector = new VariableInspector(this.inspector);
      this.variableInspector.setSourceMapManager(this.sourceMapManager);

      // Enable debugging domains
      await this.inspector.send('Debugger.enable');
      await this.inspector.send('Runtime.enable');

      // Set up event handlers BEFORE calling runIfWaitingForDebugger
      this.inspector.on('Debugger.paused', async (params: any) => {
        this.state = SessionState.PAUSED;
        this.currentCallFrames = params?.callFrames || [];
        this.currentFrameIndex = 0; // Reset to top frame when paused

        // Evaluate watched variables when paused
        if (this.watchedVariables.size > 0) {
          try {
            const changes = await this.evaluateWatchedVariables();
            this.watchedVariableChanges = changes;
          } catch (error) {
            // Ignore errors during watch evaluation
          }
        }
      });

      this.inspector.on('Debugger.resumed', () => {
        this.state = SessionState.RUNNING;
        this.currentCallFrames = [];
        this.currentFrameIndex = 0; // Reset frame index when resumed
      });

      // Handle process exit
      this.process.on('exit', (code: number | null, signal: string | null) => {
        this.handleProcessExit(code, signal);
      });

      // Handle process errors
      this.process.on('error', (error: Error) => {
        this.handleProcessError(error);
      });

      // Tell the runtime to run if it's waiting for debugger
      // This will trigger a Debugger.paused event at the first line
      await this.inspector.send('Runtime.runIfWaitingForDebugger');

      // Wait for the initial pause from --inspect-brk
      // The process should pause at the first line after runIfWaitingForDebugger
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          // If we don't get a paused event within 1 second, assume we're paused
          this.state = SessionState.PAUSED;
          resolve();
        }, 1000);

        this.inspector!.once('Debugger.paused', () => {
          clearTimeout(timeout);
          this.state = SessionState.PAUSED;
          resolve();
        });
      });
    } catch (error) {
      this.state = SessionState.TERMINATED;
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Pause the running process
   * Waits for the Debugger.paused event to ensure call frames are populated
   */
  async pause(): Promise<void> {
    if (!this.inspector) {
      throw new Error('Session not started');
    }

    if (this.state !== SessionState.RUNNING) {
      throw new Error(`Cannot pause session in state: ${this.state}`);
    }

    // Send the pause command
    await this.inspector.send('Debugger.pause');

    // Wait for the Debugger.paused event with a reasonable timeout
    // This ensures call frames are populated before we return
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        // Timeout - resolve anyway, state should be updated by event handler
        resolve();
      }, 500);

      const handler = () => {
        clearTimeout(timeout);
        resolve();
      };

      this.inspector!.once('Debugger.paused', handler);
    });
  }

  /**
   * Resume execution of the paused process
   */
  async resume(): Promise<void> {
    if (!this.inspector) {
      throw new Error('Session not started');
    }

    if (this.state !== SessionState.PAUSED) {
      throw new Error(`Cannot resume session in state: ${this.state}`);
    }

    await this.inspector.send('Debugger.resume');
    this.state = SessionState.RUNNING;
  }

  /**
   * Step over the current line
   * Executes the current line and pauses at the next line in the same scope
   */
  async stepOver(): Promise<void> {
    if (!this.inspector) {
      throw new Error('Session not started');
    }

    if (this.state !== SessionState.PAUSED) {
      throw new Error(`Cannot step over in state: ${this.state}`);
    }

    await this.inspector.send('Debugger.stepOver');
    // State will be updated by Debugger.paused event
  }

  /**
   * Step into the current line
   * Executes the current line and pauses at the first line inside any called function
   */
  async stepInto(): Promise<void> {
    if (!this.inspector) {
      throw new Error('Session not started');
    }

    if (this.state !== SessionState.PAUSED) {
      throw new Error(`Cannot step into in state: ${this.state}`);
    }

    await this.inspector.send('Debugger.stepInto');
    // State will be updated by Debugger.paused event
  }

  /**
   * Step out of the current function
   * Executes until the current function returns and pauses at the calling location
   */
  async stepOut(): Promise<void> {
    if (!this.inspector) {
      throw new Error('Session not started');
    }

    if (this.state !== SessionState.PAUSED) {
      throw new Error(`Cannot step out in state: ${this.state}`);
    }

    await this.inspector.send('Debugger.stepOut');
    // State will be updated by Debugger.paused event
  }

  /**
   * Clean up session resources
   */
  async cleanup(): Promise<void> {
    // Remove all breakpoints
    if (
      this.cdpBreakpointOps &&
      this.inspector &&
      this.inspector.isConnected()
    ) {
      for (const breakpoint of this.breakpointManager.getAllBreakpoints()) {
        if (breakpoint.cdpBreakpointId) {
          try {
            await this.cdpBreakpointOps.removeBreakpoint(
              breakpoint.cdpBreakpointId,
            );
          } catch (error) {
            // Ignore errors during cleanup
          }
        }
      }
    }

    // Disconnect inspector
    if (this.inspector) {
      await this.inspector.disconnect();
      this.inspector = null;
    }

    // Kill process if still running
    if (this.process && !this.process.killed) {
      this.process.kill();
    }

    this.process = null;
    this.state = SessionState.TERMINATED;
    this.cdpBreakpointOps = null;
    this.breakpointManager.clearAll();
    this.watchedVariables.clear();
    this.watchedVariableChanges.clear();

    // Clear source map cache
    this.sourceMapManager.clearCache();
  }

  /**
   * Get the current session state
   */
  getState(): SessionState {
    return this.state;
  }

  /**
   * Get the inspector client
   */
  getInspector(): InspectorClient | null {
    return this.inspector;
  }

  /**
   * Get the process handle
   */
  getProcess(): ChildProcess | null {
    return this.process;
  }

  /**
   * Set a breakpoint in the session
   * Creates the breakpoint and sets it via CDP
   * Maps TypeScript locations to JavaScript when source maps are available
   * Requirements: 7.2
   */
  async setBreakpoint(
    file: string,
    line: number,
    condition?: string,
  ): Promise<Breakpoint> {
    if (!this.cdpBreakpointOps) {
      throw new Error('Session not started');
    }

    // Try to map TypeScript location to JavaScript if it's a TypeScript file
    let targetFile = file;
    let targetLine = line;

    if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const compiledLocation = await this.sourceMapManager.mapSourceToCompiled({
        file,
        line,
        column: 0,
      });

      if (compiledLocation) {
        targetFile = compiledLocation.file;
        targetLine = compiledLocation.line;
      }
    }

    // Create breakpoint in manager with the original file/line
    // This ensures the user sees the TypeScript location
    const breakpoint = this.breakpointManager.createBreakpoint(
      file,
      line,
      condition,
    );

    // Set breakpoint via CDP using the compiled location if enabled
    if (breakpoint.enabled) {
      // Create a temporary breakpoint object with the compiled location for CDP
      const cdpBreakpoint = {
        ...breakpoint,
        file: targetFile,
        line: targetLine,
      };

      const cdpBreakpointId =
        await this.cdpBreakpointOps.setBreakpoint(cdpBreakpoint);
      if (cdpBreakpointId) {
        this.breakpointManager.updateCdpBreakpointId(
          breakpoint.id,
          cdpBreakpointId,
        );
      }
    }

    return breakpoint;
  }

  /**
   * Get a breakpoint by ID
   */
  getBreakpoint(id: string): Breakpoint | undefined {
    return this.breakpointManager.getBreakpoint(id);
  }

  /**
   * Get all breakpoints
   */
  getAllBreakpoints(): Breakpoint[] {
    return this.breakpointManager.getAllBreakpoints();
  }

  /**
   * Remove a breakpoint from the session
   * Removes from manager and from CDP
   */
  async removeBreakpoint(id: string): Promise<boolean> {
    const breakpoint = this.breakpointManager.getBreakpoint(id);
    if (!breakpoint) {
      return false;
    }

    // Remove from CDP if it has a CDP breakpoint ID
    if (breakpoint.cdpBreakpointId && this.cdpBreakpointOps) {
      await this.cdpBreakpointOps.removeBreakpoint(breakpoint.cdpBreakpointId);
    }

    // Remove from manager
    return this.breakpointManager.removeBreakpoint(id);
  }

  /**
   * Toggle a breakpoint's enabled state
   */
  async toggleBreakpoint(id: string): Promise<Breakpoint | undefined> {
    const breakpoint = this.breakpointManager.toggleBreakpoint(id);
    if (!breakpoint || !this.cdpBreakpointOps) {
      return breakpoint;
    }

    // If now enabled, set via CDP
    if (breakpoint.enabled && !breakpoint.cdpBreakpointId) {
      const cdpBreakpointId =
        await this.cdpBreakpointOps.setBreakpoint(breakpoint);
      if (cdpBreakpointId) {
        this.breakpointManager.updateCdpBreakpointId(
          breakpoint.id,
          cdpBreakpointId,
        );
      }
    }
    // If now disabled, remove from CDP
    else if (!breakpoint.enabled && breakpoint.cdpBreakpointId) {
      await this.cdpBreakpointOps.removeBreakpoint(breakpoint.cdpBreakpointId);
      this.breakpointManager.updateCdpBreakpointId(breakpoint.id, '');
    }

    return breakpoint;
  }

  /**
   * Add a breakpoint to the session (legacy method for compatibility)
   */
  addBreakpoint(breakpoint: Breakpoint): void {
    // This is a legacy method - breakpoints should be created via setBreakpoint
    // But we keep it for backward compatibility with tests
    this.breakpointManager.addBreakpoint(breakpoint);
  }

  /**
   * Add a watched variable
   */
  addWatchedVariable(variable: WatchedVariable): void {
    this.watchedVariables.set(variable.name, variable);
  }

  /**
   * Get a watched variable by name
   */
  getWatchedVariable(name: string): WatchedVariable | undefined {
    return this.watchedVariables.get(name);
  }

  /**
   * Get all watched variables
   */
  getAllWatchedVariables(): WatchedVariable[] {
    return Array.from(this.watchedVariables.values());
  }

  /**
   * Remove a watched variable
   */
  removeWatchedVariable(name: string): boolean {
    return this.watchedVariables.delete(name);
  }

  /**
   * Check if the session is active (not terminated)
   */
  isActive(): boolean {
    return this.state !== SessionState.TERMINATED;
  }

  /**
   * Check if the session is paused
   */
  isPaused(): boolean {
    return this.state === SessionState.PAUSED;
  }

  /**
   * Evaluate an expression in the current execution context
   * @param expression The JavaScript expression to evaluate
   * @param callFrameId Optional call frame ID (uses current frame if not provided)
   * @returns The evaluation result with type information
   */
  async evaluateExpression(
    expression: string,
    callFrameId?: string,
  ): Promise<EvaluationResult> {
    if (!this.variableInspector) {
      throw new Error('Session not started');
    }

    if (this.state !== SessionState.PAUSED) {
      throw new Error('Process must be paused to evaluate expressions');
    }

    // If no callFrameId provided, use the current frame
    const frameId =
      callFrameId ||
      this.currentCallFrames[this.currentFrameIndex]?.callFrameId;
    if (!frameId) {
      throw new Error('No call frames available');
    }

    return this.variableInspector.evaluateExpression(expression, frameId);
  }

  /**
   * Get properties of an object by its object ID
   * @param objectId The CDP object ID
   * @returns Array of property descriptors
   */
  async getObjectProperties(objectId: string): Promise<PropertyDescriptor[]> {
    if (!this.variableInspector) {
      throw new Error('Session not started');
    }

    if (this.state !== SessionState.PAUSED) {
      throw new Error('Process must be paused to inspect objects');
    }

    return this.variableInspector.getObjectProperties(objectId);
  }

  /**
   * Inspect an object with nested property resolution
   * @param objectId The CDP object ID
   * @param maxDepth Maximum depth to traverse (default: 2)
   * @returns Nested object structure
   */
  async inspectObject(
    objectId: string,
    maxDepth: number = 2,
  ): Promise<Record<string, any>> {
    if (!this.variableInspector) {
      throw new Error('Session not started');
    }

    if (this.state !== SessionState.PAUSED) {
      throw new Error('Process must be paused to inspect objects');
    }

    return this.variableInspector.inspectObject(objectId, maxDepth);
  }

  /**
   * Get the current call frames
   */
  getCurrentCallFrames(): any[] {
    return this.currentCallFrames;
  }

  /**
   * Get the call stack with formatted stack frames
   * Returns stack frames with function names, files (absolute paths), and line numbers
   * Maps JavaScript locations back to TypeScript when source maps are available
   * Requirements: 4.1, 9.4, 7.3
   */
  async getCallStack(): Promise<StackFrame[]> {
    if (this.state !== SessionState.PAUSED) {
      throw new Error('Process must be paused to get call stack');
    }

    if (!this.currentCallFrames || this.currentCallFrames.length === 0) {
      return [];
    }

    const frames: StackFrame[] = [];

    for (const frame of this.currentCallFrames) {
      // Extract file path from the URL
      // CDP returns file URLs like "file:///absolute/path/to/file.js"
      let filePath = frame.url || '';

      // Convert file:// URL to absolute path
      if (filePath.startsWith('file://')) {
        filePath = filePath.substring(7); // Remove 'file://'
      }

      // Ensure the path is absolute
      // If it's not already absolute, make it absolute relative to cwd
      if (!filePath.startsWith('/')) {
        filePath = path.resolve(this.config.cwd || process.cwd(), filePath);
      }

      let line = frame.location.lineNumber + 1; // CDP uses 0-indexed lines
      let column = frame.location.columnNumber;

      // Try to map back to source location if source map is available
      const sourceLocation = await this.sourceMapManager.mapCompiledToSource({
        file: filePath,
        line: line,
        column: column,
      });

      if (sourceLocation) {
        filePath = sourceLocation.file;
        line = sourceLocation.line;
        column = sourceLocation.column;
      }

      frames.push({
        functionName: frame.functionName || '(anonymous)',
        file: filePath,
        line: line,
        column: column,
        callFrameId: frame.callFrameId,
      });
    }

    return frames;
  }

  /**
   * Get the call stack synchronously (without source map mapping)
   * Use getCallStack() for source map support
   * @deprecated Use getCallStack() instead for source map support
   */
  getCallStackSync(): StackFrame[] {
    if (this.state !== SessionState.PAUSED) {
      throw new Error('Process must be paused to get call stack');
    }

    if (!this.currentCallFrames || this.currentCallFrames.length === 0) {
      return [];
    }

    return this.currentCallFrames.map((frame: any) => {
      // Extract file path from the URL
      // CDP returns file URLs like "file:///absolute/path/to/file.js"
      let filePath = frame.url || '';

      // Convert file:// URL to absolute path
      if (filePath.startsWith('file://')) {
        filePath = filePath.substring(7); // Remove 'file://'
      }

      // Ensure the path is absolute
      // If it's not already absolute, make it absolute relative to cwd
      if (!filePath.startsWith('/')) {
        filePath = path.resolve(this.config.cwd || process.cwd(), filePath);
      }

      return {
        functionName: frame.functionName || '(anonymous)',
        file: filePath,
        line: frame.location.lineNumber + 1, // CDP uses 0-indexed lines
        column: frame.location.columnNumber,
        callFrameId: frame.callFrameId,
      };
    });
  }

  /**
   * Evaluate watched variables and detect changes
   * Should be called when the process pauses
   */
  async evaluateWatchedVariables(): Promise<
    Map<string, { oldValue: any; newValue: any }>
  > {
    const changes = new Map<string, { oldValue: any; newValue: any }>();

    for (const [name, watched] of this.watchedVariables.entries()) {
      try {
        const result = await this.evaluateExpression(watched.expression);
        const newValue = result.value;

        if (watched.lastValue !== undefined && watched.lastValue !== newValue) {
          changes.set(name, {
            oldValue: watched.lastValue,
            newValue: newValue,
          });
        }

        watched.lastValue = newValue;
      } catch (error) {
        // Ignore evaluation errors for watched variables
      }
    }

    return changes;
  }

  /**
   * Get the latest watched variable changes from the last pause
   * Returns a map of variable names to their old and new values
   */
  getWatchedVariableChanges(): Map<string, { oldValue: any; newValue: any }> {
    return new Map(this.watchedVariableChanges);
  }

  /**
   * Clear the watched variable changes
   */
  clearWatchedVariableChanges(): void {
    this.watchedVariableChanges.clear();
  }

  /**
   * Switch context to a different stack frame by index
   * Updates the current frame for variable inspection
   * Requirements: 4.2, 4.3
   * @param frameIndex The index of the frame to switch to (0 = top frame)
   */
  switchToFrame(frameIndex: number): void {
    if (this.state !== SessionState.PAUSED) {
      throw new Error('Process must be paused to switch frames');
    }

    if (!this.currentCallFrames || this.currentCallFrames.length === 0) {
      throw new Error('No call frames available');
    }

    if (frameIndex < 0 || frameIndex >= this.currentCallFrames.length) {
      throw new Error(
        `Frame index ${frameIndex} out of range (0-${this.currentCallFrames.length - 1})`,
      );
    }

    this.currentFrameIndex = frameIndex;
  }

  /**
   * Get the current frame index
   */
  getCurrentFrameIndex(): number {
    return this.currentFrameIndex;
  }

  /**
   * Get the call frame ID for the current frame
   */
  getCurrentCallFrameId(): string | undefined {
    if (!this.currentCallFrames || this.currentCallFrames.length === 0) {
      return undefined;
    }

    if (this.currentFrameIndex >= this.currentCallFrames.length) {
      return undefined;
    }

    return this.currentCallFrames[this.currentFrameIndex]?.callFrameId;
  }

  /**
   * Get the source map manager for this session
   */
  getSourceMapManager(): SourceMapManager {
    return this.sourceMapManager;
  }

  /**
   * Map a source location to compiled location using source maps
   * Requirements: 7.2
   */
  async mapSourceToCompiled(file: string, line: number, column: number = 0) {
    return this.sourceMapManager.mapSourceToCompiled({ file, line, column });
  }

  /**
   * Map a compiled location to source location using source maps
   * Requirements: 7.3
   */
  async mapCompiledToSource(file: string, line: number, column: number = 0) {
    return this.sourceMapManager.mapCompiledToSource({ file, line, column });
  }

  /**
   * Handle process exit event
   * Detects unexpected terminations and cleans up resources
   * Requirements: 8.1
   */
  private handleProcessExit(code: number | null, signal: string | null): void {
    const wasActive = this.state !== SessionState.TERMINATED;

    // Only process if we haven't already handled this exit
    if (!wasActive) {
      return;
    }

    this.state = SessionState.TERMINATED;

    // If the process exited unexpectedly (non-zero exit code or killed by signal)
    // this is a crash
    if (code !== 0 || signal !== null) {
      const error = new Error(
        `Process crashed with ${signal ? `signal ${signal}` : `exit code ${code}`}`,
      );
      this.crashError = error;

      // Call all registered crash handlers
      for (const handler of this.crashHandlers) {
        try {
          handler(error);
        } catch (handlerError) {
          // Ignore errors in crash handlers
        }
      }

      // Trigger cleanup asynchronously
      this.cleanup().catch(() => {
        // Ignore cleanup errors during crash handling
      });
    } else {
      // Normal exit (code 0), still clean up
      this.cleanup().catch(() => {
        // Ignore cleanup errors
      });
    }
  }

  /**
   * Handle process error event
   * Detects spawn errors and other process-level errors
   * Requirements: 8.1
   */
  private handleProcessError(error: Error): void {
    this.state = SessionState.TERMINATED;
    this.crashError = error;

    // Call all registered crash handlers
    for (const handler of this.crashHandlers) {
      try {
        handler(error);
      } catch (handlerError) {
        // Ignore errors in crash handlers
      }
    }

    // Trigger cleanup asynchronously
    this.cleanup().catch(() => {
      // Ignore cleanup errors during crash handling
    });
  }

  /**
   * Register a crash handler callback
   * The handler will be called when the process crashes or terminates unexpectedly
   * Multiple handlers can be registered and all will be called
   * Requirements: 8.1
   */
  onCrash(handler: (error: Error) => void): void {
    this.crashHandlers.push(handler);
  }

  /**
   * Get the crash error if the process crashed
   * Returns undefined if the process terminated normally
   * Requirements: 8.1
   */
  getCrashError(): Error | undefined {
    return this.crashError;
  }

  /**
   * Check if the process crashed
   * Returns true if the process terminated unexpectedly
   * Requirements: 8.1
   */
  hasCrashed(): boolean {
    return this.crashError !== undefined;
  }
}
