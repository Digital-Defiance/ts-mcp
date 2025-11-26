import { ChildProcess } from 'child_process';
import { InspectorClient } from './inspector-client';
import { spawnWithInspector } from './process-spawner';
import { BreakpointManager } from './breakpoint-manager';
import { CdpBreakpointOperations } from './cdp-breakpoint-operations';
import {
  VariableInspector,
  EvaluationResult,
  PropertyDescriptor,
} from './variable-inspector';

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
  private watchedVariables = new Map<string, WatchedVariable>();
  private watchedVariableChanges = new Map<
    string,
    { oldValue: any; newValue: any }
  >();
  private config: DebugSessionConfig;
  private currentCallFrames: any[] = [];

  constructor(id: string, config: DebugSessionConfig) {
    this.id = id;
    this.config = config;
    this.breakpointManager = new BreakpointManager();
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

      // Enable debugging domains
      await this.inspector.send('Debugger.enable');
      await this.inspector.send('Runtime.enable');

      // Tell the runtime to run if it's waiting for debugger
      // This is needed when using --inspect-brk
      await this.inspector.send('Runtime.runIfWaitingForDebugger');

      // Set up event handlers
      this.inspector.on('Debugger.paused', async (params: any) => {
        this.state = SessionState.PAUSED;
        this.currentCallFrames = params?.callFrames || [];

        // Evaluate watched variables when paused
        if (this.watchedVariables.size > 0) {
          try {
            await this.evaluateWatchedVariables();
          } catch (error) {
            // Ignore errors during watch evaluation
          }
        }
      });

      this.inspector.on('Debugger.resumed', () => {
        this.state = SessionState.RUNNING;
        this.currentCallFrames = [];
      });

      // Handle process exit
      this.process.on('exit', () => {
        this.state = SessionState.TERMINATED;
      });

      // Wait for the initial pause from --inspect-brk
      // The process should already be paused, but we need to wait for the event
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
   */
  async pause(): Promise<void> {
    if (!this.inspector) {
      throw new Error('Session not started');
    }

    if (this.state !== SessionState.RUNNING) {
      throw new Error(`Cannot pause session in state: ${this.state}`);
    }

    await this.inspector.send('Debugger.pause');
    this.state = SessionState.PAUSED;
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
   */
  async setBreakpoint(
    file: string,
    line: number,
    condition?: string,
  ): Promise<Breakpoint> {
    if (!this.cdpBreakpointOps) {
      throw new Error('Session not started');
    }

    // Create breakpoint in manager
    const breakpoint = this.breakpointManager.createBreakpoint(
      file,
      line,
      condition,
    );

    // Set breakpoint via CDP if enabled
    if (breakpoint.enabled) {
      const cdpBreakpointId =
        await this.cdpBreakpointOps.setBreakpoint(breakpoint);
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
   * @param callFrameId Optional call frame ID (uses top frame if not provided)
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

    // If no callFrameId provided, use the top frame
    const frameId = callFrameId || this.currentCallFrames[0]?.callFrameId;
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
}
