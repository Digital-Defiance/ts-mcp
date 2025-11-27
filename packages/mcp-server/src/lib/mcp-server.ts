import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  SessionManager,
  HangDetector,
  DebugSessionConfig,
} from '@digitaldefiance/ts-mcp-core';

/**
 * MCP Debugger Server
 * Provides debugging capabilities for Node.js and TypeScript applications
 * through the Model Context Protocol
 */
export class McpDebuggerServer {
  private server: McpServer;
  private sessionManager: SessionManager;
  private hangDetector: HangDetector;

  constructor() {
    this.server = new McpServer(
      {
        name: 'debugger-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.sessionManager = new SessionManager();
    this.hangDetector = new HangDetector();

    this.registerTools();
  }

  /**
   * Register all MCP tools
   */
  private registerTools(): void {
    this.registerDebuggerStart();
    this.registerDebuggerSetBreakpoint();
    this.registerDebuggerContinue();
    this.registerDebuggerStepOver();
    this.registerDebuggerInspect();
    this.registerDebuggerGetStack();
    this.registerDebuggerDetectHang();
  }

  /**
   * Tool: debugger_start
   * Start a new debug session
   * Requirements: 2.1, 9.1
   */
  private registerDebuggerStart(): void {
    this.server.registerTool(
      'debugger_start',
      {
        description:
          'Start a new debug session with a Node.js process. The process will be paused at the start.',
        inputSchema: {
          command: z
            .string()
            .describe('The command to execute (e.g., "node", "npm")'),
          args: z
            .array(z.string())
            .optional()
            .describe('Command arguments (e.g., ["test.js"])'),
          cwd: z
            .string()
            .optional()
            .describe('Working directory for the process'),
          timeout: z
            .number()
            .optional()
            .describe('Timeout in milliseconds (default: 30000)'),
        },
      },
      async (args) => {
        try {
          const config: DebugSessionConfig = {
            command: args.command,
            args: args.args,
            cwd: args.cwd,
            timeout: args.timeout || 30000,
          };

          const session = await this.sessionManager.createSession(config);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    status: 'success',
                    sessionId: session.id,
                    state: session.getState(),
                    pid: session.getProcess()?.pid,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    status: 'error',
                    code: 'SESSION_START_FAILED',
                    message:
                      error instanceof Error ? error.message : String(error),
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }
      },
    );
  }

  /**
   * Tool: debugger_set_breakpoint
   * Set a breakpoint in the debug session
   * Requirements: 1.1, 1.2, 9.1
   */
  private registerDebuggerSetBreakpoint(): void {
    this.server.registerTool(
      'debugger_set_breakpoint',
      {
        description:
          'Set a breakpoint at a specific file and line number. Optionally provide a condition.',
        inputSchema: {
          sessionId: z.string().describe('The debug session ID'),
          file: z.string().describe('The file path (absolute or relative)'),
          line: z.number().describe('The line number (1-indexed)'),
          condition: z
            .string()
            .optional()
            .describe('Optional condition expression (e.g., "x > 10")'),
        },
      },
      async (args) => {
        try {
          const session = this.sessionManager.getSession(args.sessionId);
          if (!session) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      status: 'error',
                      code: 'SESSION_NOT_FOUND',
                      message: `Session ${args.sessionId} not found`,
                    },
                    null,
                    2,
                  ),
                },
              ],
              isError: true,
            };
          }

          const breakpoint = await session.setBreakpoint(
            args.file,
            args.line,
            args.condition,
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    status: 'success',
                    breakpointId: breakpoint.id,
                    file: breakpoint.file,
                    line: breakpoint.line,
                    condition: breakpoint.condition,
                    enabled: breakpoint.enabled,
                    verified: !!breakpoint.cdpBreakpointId,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    status: 'error',
                    code: 'BREAKPOINT_SET_FAILED',
                    message:
                      error instanceof Error ? error.message : String(error),
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }
      },
    );
  }

  /**
   * Tool: debugger_continue
   * Resume execution of a paused debug session
   * Requirements: 2.2, 9.1
   */
  private registerDebuggerContinue(): void {
    this.server.registerTool(
      'debugger_continue',
      {
        description:
          'Resume execution of a paused debug session until the next breakpoint or program termination.',
        inputSchema: {
          sessionId: z.string().describe('The debug session ID'),
        },
      },
      async (args) => {
        try {
          const session = this.sessionManager.getSession(args.sessionId);
          if (!session) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      status: 'error',
                      code: 'SESSION_NOT_FOUND',
                      message: `Session ${args.sessionId} not found`,
                    },
                    null,
                    2,
                  ),
                },
              ],
              isError: true,
            };
          }

          await session.resume();

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    status: 'success',
                    state: session.getState(),
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    status: 'error',
                    code: 'CONTINUE_FAILED',
                    message:
                      error instanceof Error ? error.message : String(error),
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }
      },
    );
  }

  /**
   * Tool: debugger_step_over
   * Step over the current line
   * Requirements: 2.3, 9.1
   */
  private registerDebuggerStepOver(): void {
    this.server.registerTool(
      'debugger_step_over',
      {
        description:
          'Execute the current line and pause at the next line in the same scope.',
        inputSchema: {
          sessionId: z.string().describe('The debug session ID'),
        },
      },
      async (args) => {
        try {
          const session = this.sessionManager.getSession(args.sessionId);
          if (!session) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      status: 'error',
                      code: 'SESSION_NOT_FOUND',
                      message: `Session ${args.sessionId} not found`,
                    },
                    null,
                    2,
                  ),
                },
              ],
              isError: true,
            };
          }

          await session.stepOver();

          // Wait a bit for the paused event to populate call frames
          await new Promise((resolve) => setTimeout(resolve, 100));

          const stack = await session.getCallStack();
          const location =
            stack.length > 0
              ? { file: stack[0].file, line: stack[0].line }
              : null;

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    status: 'success',
                    state: session.getState(),
                    location,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    status: 'error',
                    code: 'STEP_OVER_FAILED',
                    message:
                      error instanceof Error ? error.message : String(error),
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }
      },
    );
  }

  /**
   * Tool: debugger_inspect
   * Evaluate an expression in the current execution context
   * Requirements: 3.4, 9.1, 9.3
   */
  private registerDebuggerInspect(): void {
    this.server.registerTool(
      'debugger_inspect',
      {
        description:
          'Evaluate a JavaScript expression in the current execution context and return the result with type information.',
        inputSchema: {
          sessionId: z.string().describe('The debug session ID'),
          expression: z
            .string()
            .describe('The JavaScript expression to evaluate (e.g., "x + 1")'),
        },
      },
      async (args) => {
        try {
          const session = this.sessionManager.getSession(args.sessionId);
          if (!session) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      status: 'error',
                      code: 'SESSION_NOT_FOUND',
                      message: `Session ${args.sessionId} not found`,
                    },
                    null,
                    2,
                  ),
                },
              ],
              isError: true,
            };
          }

          const result = await session.evaluateExpression(args.expression);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    status: 'success',
                    expression: args.expression,
                    value: result.value,
                    type: result.type,
                    objectId: result.objectId,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    status: 'error',
                    code: 'INSPECT_FAILED',
                    message:
                      error instanceof Error ? error.message : String(error),
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }
      },
    );
  }

  /**
   * Tool: debugger_get_stack
   * Get the current call stack
   * Requirements: 4.1, 9.1, 9.4
   */
  private registerDebuggerGetStack(): void {
    this.server.registerTool(
      'debugger_get_stack',
      {
        description:
          'Get the current call stack with function names, file locations (absolute paths), and line numbers.',
        inputSchema: {
          sessionId: z.string().describe('The debug session ID'),
        },
      },
      async (args) => {
        try {
          const session = this.sessionManager.getSession(args.sessionId);
          if (!session) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      status: 'error',
                      code: 'SESSION_NOT_FOUND',
                      message: `Session ${args.sessionId} not found`,
                    },
                    null,
                    2,
                  ),
                },
              ],
              isError: true,
            };
          }

          const stack = await session.getCallStack();

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    status: 'success',
                    stack: stack.map((frame) => ({
                      function: frame.functionName,
                      file: frame.file,
                      line: frame.line,
                      column: frame.column,
                    })),
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    status: 'error',
                    code: 'GET_STACK_FAILED',
                    message:
                      error instanceof Error ? error.message : String(error),
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }
      },
    );
  }

  /**
   * Tool: debugger_detect_hang
   * Detect if a process hangs or enters an infinite loop
   * Requirements: 5.1, 5.2, 5.3, 5.4, 9.1
   */
  private registerDebuggerDetectHang(): void {
    this.server.registerTool(
      'debugger_detect_hang',
      {
        description:
          'Run a command and detect if it hangs or enters an infinite loop. Returns hang status, location, and stack trace if hung.',
        inputSchema: {
          command: z
            .string()
            .describe('The command to execute (e.g., "node", "npm")'),
          args: z
            .array(z.string())
            .optional()
            .describe('Command arguments (e.g., ["test.js"])'),
          cwd: z
            .string()
            .optional()
            .describe('Working directory for the process'),
          timeout: z.number().describe('Timeout in milliseconds (e.g., 5000)'),
          sampleInterval: z
            .number()
            .optional()
            .describe(
              'Sample interval in milliseconds for infinite loop detection (e.g., 100)',
            ),
        },
      },
      async (args) => {
        try {
          const result = await this.hangDetector.detectHang({
            command: args.command,
            args: args.args,
            cwd: args.cwd,
            timeout: args.timeout,
            sampleInterval: args.sampleInterval,
          });

          if (result.hung) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      status: 'success',
                      hung: true,
                      location: result.location,
                      stack: result.stack,
                      message: result.message,
                      duration: result.duration,
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      status: 'success',
                      hung: false,
                      completed: result.completed,
                      exitCode: result.exitCode,
                      duration: result.duration,
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    status: 'error',
                    code: 'HANG_DETECTION_FAILED',
                    message:
                      error instanceof Error ? error.message : String(error),
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }
      },
    );
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  /**
   * Stop the MCP server and cleanup all sessions
   */
  async stop(): Promise<void> {
    await this.sessionManager.cleanupAll();
    await this.server.close();
  }
}

/**
 * Create and start the MCP debugger server
 */
export async function startMcpDebuggerServer(): Promise<McpDebuggerServer> {
  const server = new McpDebuggerServer();
  await server.start();
  return server;
}
