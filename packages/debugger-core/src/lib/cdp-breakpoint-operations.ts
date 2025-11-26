import { InspectorClient } from './inspector-client';
import { Breakpoint } from './debug-session';

/**
 * Script information from CDP
 */
interface ScriptInfo {
  scriptId: string;
  url: string;
}

/**
 * Handles CDP breakpoint operations
 * Maps file paths to script IDs and manages breakpoint lifecycle via CDP
 */
export class CdpBreakpointOperations {
  private scripts = new Map<string, ScriptInfo>();

  constructor(private inspector: InspectorClient) {
    // Listen for script parsed events to build script ID mapping
    this.inspector.on('Debugger.scriptParsed', (params: any) => {
      if (params.url && params.scriptId) {
        this.scripts.set(params.url, {
          scriptId: params.scriptId,
          url: params.url,
        });
      }
    });
  }

  /**
   * Set a breakpoint via CDP
   * @param breakpoint Breakpoint to set
   * @returns CDP breakpoint ID if successful
   */
  async setBreakpoint(breakpoint: Breakpoint): Promise<string | undefined> {
    try {
      // Try to set breakpoint by URL (works for most cases)
      const result = await this.inspector.send('Debugger.setBreakpointByUrl', {
        lineNumber: breakpoint.line - 1, // CDP uses 0-indexed lines
        url: `file://${breakpoint.file}`,
        columnNumber: 0,
        condition: breakpoint.condition || undefined,
      });

      return result.breakpointId;
    } catch (error) {
      // If setting by URL fails, try to find the script ID
      const scriptInfo = this.findScriptByFile(breakpoint.file);
      if (scriptInfo) {
        try {
          const result = await this.inspector.send('Debugger.setBreakpoint', {
            location: {
              scriptId: scriptInfo.scriptId,
              lineNumber: breakpoint.line - 1,
              columnNumber: 0,
            },
            condition: breakpoint.condition || undefined,
          });

          return result.breakpointId;
        } catch (innerError) {
          console.error(
            `Failed to set breakpoint at ${breakpoint.file}:${breakpoint.line}`,
            innerError,
          );
          return undefined;
        }
      }

      console.error(
        `Failed to set breakpoint at ${breakpoint.file}:${breakpoint.line}`,
        error,
      );
      return undefined;
    }
  }

  /**
   * Remove a breakpoint via CDP
   * @param cdpBreakpointId CDP breakpoint ID
   * @returns True if successful
   */
  async removeBreakpoint(cdpBreakpointId: string): Promise<boolean> {
    try {
      await this.inspector.send('Debugger.removeBreakpoint', {
        breakpointId: cdpBreakpointId,
      });
      return true;
    } catch (error) {
      console.error(`Failed to remove breakpoint ${cdpBreakpointId}`, error);
      return false;
    }
  }

  /**
   * Find a script by file path
   * Handles both exact matches and partial matches (e.g., relative vs absolute paths)
   */
  private findScriptByFile(filePath: string): ScriptInfo | undefined {
    // Try exact match first
    const exactMatch = this.scripts.get(`file://${filePath}`);
    if (exactMatch) {
      return exactMatch;
    }

    // Try to find by filename (handles relative paths)
    const fileName = filePath.split('/').pop();
    if (fileName) {
      for (const [url, scriptInfo] of this.scripts.entries()) {
        if (url.endsWith(fileName) || url.includes(filePath)) {
          return scriptInfo;
        }
      }
    }

    return undefined;
  }

  /**
   * Get all known scripts
   */
  getScripts(): ScriptInfo[] {
    return Array.from(this.scripts.values());
  }

  /**
   * Clear the script cache
   */
  clearScripts(): void {
    this.scripts.clear();
  }
}
