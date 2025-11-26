import { randomBytes } from 'crypto';
import { Breakpoint } from './debug-session';

/**
 * Manages breakpoints for a debug session
 * Handles breakpoint CRUD operations and state management
 */
export class BreakpointManager {
  private breakpoints = new Map<string, Breakpoint>();

  /**
   * Generate a unique breakpoint identifier
   */
  private generateBreakpointId(): string {
    return `bp_${randomBytes(8).toString('hex')}`;
  }

  /**
   * Create a new breakpoint
   * @param file File path where the breakpoint should be set
   * @param line Line number (1-indexed)
   * @param condition Optional condition expression
   * @returns The created breakpoint
   */
  createBreakpoint(file: string, line: number, condition?: string): Breakpoint {
    const id = this.generateBreakpointId();
    const breakpoint: Breakpoint = {
      id,
      file,
      line,
      condition,
      enabled: true,
    };

    this.breakpoints.set(id, breakpoint);
    return breakpoint;
  }

  /**
   * Add an existing breakpoint (for backward compatibility)
   * @param breakpoint Breakpoint to add
   */
  addBreakpoint(breakpoint: Breakpoint): void {
    this.breakpoints.set(breakpoint.id, breakpoint);
  }

  /**
   * Get a breakpoint by ID
   * @param id Breakpoint identifier
   * @returns The breakpoint or undefined if not found
   */
  getBreakpoint(id: string): Breakpoint | undefined {
    return this.breakpoints.get(id);
  }

  /**
   * Get all breakpoints
   * @returns Array of all breakpoints
   */
  getAllBreakpoints(): Breakpoint[] {
    return Array.from(this.breakpoints.values());
  }

  /**
   * Get breakpoints for a specific file
   * @param file File path
   * @returns Array of breakpoints in the file
   */
  getBreakpointsByFile(file: string): Breakpoint[] {
    return this.getAllBreakpoints().filter((bp) => bp.file === file);
  }

  /**
   * Remove a breakpoint by ID
   * @param id Breakpoint identifier
   * @returns True if the breakpoint was found and removed
   */
  removeBreakpoint(id: string): boolean {
    return this.breakpoints.delete(id);
  }

  /**
   * Toggle a breakpoint's enabled state
   * @param id Breakpoint identifier
   * @returns The updated breakpoint or undefined if not found
   */
  toggleBreakpoint(id: string): Breakpoint | undefined {
    const breakpoint = this.breakpoints.get(id);
    if (!breakpoint) {
      return undefined;
    }

    breakpoint.enabled = !breakpoint.enabled;
    return breakpoint;
  }

  /**
   * Enable a breakpoint
   * @param id Breakpoint identifier
   * @returns The updated breakpoint or undefined if not found
   */
  enableBreakpoint(id: string): Breakpoint | undefined {
    const breakpoint = this.breakpoints.get(id);
    if (!breakpoint) {
      return undefined;
    }

    breakpoint.enabled = true;
    return breakpoint;
  }

  /**
   * Disable a breakpoint
   * @param id Breakpoint identifier
   * @returns The updated breakpoint or undefined if not found
   */
  disableBreakpoint(id: string): Breakpoint | undefined {
    const breakpoint = this.breakpoints.get(id);
    if (!breakpoint) {
      return undefined;
    }

    breakpoint.enabled = false;
    return breakpoint;
  }

  /**
   * Update a breakpoint's CDP breakpoint ID
   * @param id Breakpoint identifier
   * @param cdpBreakpointId CDP breakpoint ID from the Inspector Protocol
   * @returns The updated breakpoint or undefined if not found
   */
  updateCdpBreakpointId(
    id: string,
    cdpBreakpointId: string,
  ): Breakpoint | undefined {
    const breakpoint = this.breakpoints.get(id);
    if (!breakpoint) {
      return undefined;
    }

    breakpoint.cdpBreakpointId = cdpBreakpointId;
    return breakpoint;
  }

  /**
   * Clear all breakpoints
   */
  clearAll(): void {
    this.breakpoints.clear();
  }

  /**
   * Get the number of breakpoints
   */
  getBreakpointCount(): number {
    return this.breakpoints.size;
  }

  /**
   * Check if a breakpoint exists
   * @param id Breakpoint identifier
   * @returns True if the breakpoint exists
   */
  hasBreakpoint(id: string): boolean {
    return this.breakpoints.has(id);
  }
}
