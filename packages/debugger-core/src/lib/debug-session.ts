import { ChildProcess } from 'child_process';
import { InspectorClient } from './inspector-client';
import { spawnWithInspector } from './process-spawner';

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
  private breakpoints = new Map<string, Breakpoint>();
  private watchedVariables = new Map<string, WatchedVariable>();
  private config: DebugSessionConfig;

  constructor(id: string, config: DebugSessionConfig) {
    this.id = id;
    this.config = config;
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

      // Enable debugging domains
      await this.inspector.send('Debugger.enable');
      await this.inspector.send('Runtime.enable');

      // Set up event handlers
      this.inspector.on('Debugger.paused', () => {
        this.state = SessionState.PAUSED;
      });

      this.inspector.on('Debugger.resumed', () => {
        this.state = SessionState.RUNNING;
      });

      // Handle process exit
      this.process.on('exit', () => {
        this.state = SessionState.TERMINATED;
      });

      // Session starts in paused state (--inspect-brk)
      this.state = SessionState.PAUSED;
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
   * Clean up session resources
   */
  async cleanup(): Promise<void> {
    // Remove all breakpoints
    if (this.inspector && this.inspector.isConnected()) {
      for (const breakpoint of this.breakpoints.values()) {
        if (breakpoint.cdpBreakpointId) {
          try {
            await this.inspector.send('Debugger.removeBreakpoint', {
              breakpointId: breakpoint.cdpBreakpointId,
            });
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
    this.breakpoints.clear();
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
   * Add a breakpoint to the session
   */
  addBreakpoint(breakpoint: Breakpoint): void {
    this.breakpoints.set(breakpoint.id, breakpoint);
  }

  /**
   * Get a breakpoint by ID
   */
  getBreakpoint(id: string): Breakpoint | undefined {
    return this.breakpoints.get(id);
  }

  /**
   * Get all breakpoints
   */
  getAllBreakpoints(): Breakpoint[] {
    return Array.from(this.breakpoints.values());
  }

  /**
   * Remove a breakpoint from the session
   */
  removeBreakpoint(id: string): boolean {
    return this.breakpoints.delete(id);
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
}
