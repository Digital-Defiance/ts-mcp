import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

/**
 * End-to-End tests for MCP Debugger Server
 * Tests the actual MCP protocol communication via stdio
 */
describe('MCP Debugger Server - E2E', () => {
  let serverProcess: ChildProcess;
  let messageId = 0;

  /**
   * Start the MCP server as a child process
   */
  async function startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Build the server first
      const buildProcess = spawn(
        'npx',
        ['nx', 'build', '@digitaldefiance/ts-mcp-server'],
        {
          cwd: path.join(__dirname, '../../../..'),
          stdio: 'inherit',
        },
      );

      buildProcess.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Build failed with code ${code}`));
          return;
        }

        // Start the server
        const serverPath = path.join(__dirname, '../../dist/src/index.js');
        serverProcess = spawn('node', [serverPath], {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        // Log stderr for debugging
        serverProcess.stderr?.on('data', (data) => {
          console.error('Server stderr:', data.toString());
        });

        // Log any errors
        serverProcess.on('error', (error) => {
          console.error('Server process error:', error);
          reject(error);
        });

        // Wait for server to be ready
        setTimeout(() => resolve(), 1000);
      });
    });
  }

  /**
   * Send a JSON-RPC request to the server
   */
  function sendRequest(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = ++messageId;
      const request = {
        jsonrpc: '2.0',
        id,
        method,
        params: params || {},
      };

      let responseData = '';

      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout for ${method}`));
      }, 5000);

      const onData = (data: Buffer) => {
        responseData += data.toString();

        // Try to parse complete JSON-RPC messages
        const lines = responseData.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            try {
              const response = JSON.parse(line);
              if (response.id === id) {
                clearTimeout(timeout);
                serverProcess.stdout?.removeListener('data', onData);

                if (response.error) {
                  reject(new Error(response.error.message));
                } else {
                  resolve(response.result);
                }
                return;
              }
            } catch (e) {
              // Not a complete JSON message yet, continue
            }
          }
        }
      };

      serverProcess.stdout?.on('data', onData);
      serverProcess.stdin?.write(JSON.stringify(request) + '\n');
    });
  }

  /**
   * Stop the MCP server
   */
  function stopServer(): void {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill();
    }
  }

  beforeAll(async () => {
    await startServer();
  }, 30000); // 30 second timeout for build

  afterAll(() => {
    stopServer();
  });

  describe('MCP Protocol Initialization', () => {
    it('should respond to initialize request', async () => {
      const result = await sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0',
        },
      });

      expect(result).toBeDefined();
      expect(result.protocolVersion).toBeDefined();
      expect(result.serverInfo).toBeDefined();
      expect(result.serverInfo.name).toBe('debugger-server');
      expect(result.capabilities).toBeDefined();
      expect(result.capabilities.tools).toBeDefined();
    });
  });

  describe('Tool Discovery', () => {
    it('should list all available tools', async () => {
      const result = await sendRequest('tools/list');

      expect(result).toBeDefined();
      expect(result.tools).toBeDefined();
      expect(Array.isArray(result.tools)).toBe(true);
      expect(result.tools.length).toBeGreaterThanOrEqual(7);

      const toolNames = result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('debugger_start');
      expect(toolNames).toContain('debugger_set_breakpoint');
      expect(toolNames).toContain('debugger_continue');
      expect(toolNames).toContain('debugger_step_over');
      expect(toolNames).toContain('debugger_inspect');
      expect(toolNames).toContain('debugger_get_stack');
      expect(toolNames).toContain('debugger_detect_hang');
    });

    it('should provide tool schemas', async () => {
      const result = await sendRequest('tools/list');

      for (const tool of result.tools) {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
      }
    });
  });

  describe('Tool Execution - debugger_detect_hang', () => {
    it('should detect a hanging process', async () => {
      const testFile = path.join(
        __dirname,
        '../../../debugger-core/test-fixtures/infinite-loop.js',
      );

      const result = await sendRequest('tools/call', {
        name: 'debugger_detect_hang',
        arguments: {
          command: 'node',
          args: [testFile],
          timeout: 2000,
          sampleInterval: 100,
        },
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const textContent = result.content.find((c: any) => c.type === 'text');
      expect(textContent).toBeDefined();

      const response = JSON.parse(textContent.text);
      if (response.status === 'error') {
        console.error('Error response:', response);
      }
      expect(response.status).toBe('success');
      expect(response.hung).toBe(true);
      expect(response.location).toBeDefined();
    }, 10000);

    it('should detect normal completion', async () => {
      const testFile = path.join(
        __dirname,
        '../../../debugger-core/test-fixtures/normal-completion.js',
      );

      const result = await sendRequest('tools/call', {
        name: 'debugger_detect_hang',
        arguments: {
          command: 'node',
          args: [testFile],
          timeout: 5000, // Increased timeout to avoid false positive
        },
      });

      expect(result).toBeDefined();
      const textContent = result.content.find((c: any) => c.type === 'text');
      const response = JSON.parse(textContent.text);

      if (response.hung === true) {
        console.error('False positive hang detection:', response);
      }
      expect(response.status).toBe('success');
      expect(response.hung).toBe(false);
      expect(response.completed).toBe(true);
    }, 10000);
  });

  describe('Tool Execution - debugger_start', () => {
    it('should start a debug session', async () => {
      const testFile = path.join(
        __dirname,
        '../../../debugger-core/test-fixtures/simple-script.js',
      );

      const result = await sendRequest('tools/call', {
        name: 'debugger_start',
        arguments: {
          command: 'node',
          args: [testFile],
          timeout: 5000,
        },
      });

      expect(result).toBeDefined();
      const textContent = result.content.find((c: any) => c.type === 'text');
      const response = JSON.parse(textContent.text);

      expect(response.status).toBe('success');
      expect(response.sessionId).toBeDefined();
      expect(response.state).toBe('paused');
      expect(response.pid).toBeDefined();
    }, 10000);
  });

  describe('Tool Execution - Session Operations', () => {
    let sessionId: string;
    const testFile = path.join(
      __dirname,
      '../../../debugger-core/test-fixtures/step-test-simple.js',
    );

    beforeAll(async () => {
      // Start a debug session for testing
      const result = await sendRequest('tools/call', {
        name: 'debugger_start',
        arguments: {
          command: 'node',
          args: [testFile],
          timeout: 10000,
        },
      });

      const textContent = result.content.find((c: any) => c.type === 'text');
      const response = JSON.parse(textContent.text);
      sessionId = response.sessionId;

      // Set a breakpoint at line 3
      await sendRequest('tools/call', {
        name: 'debugger_set_breakpoint',
        arguments: {
          sessionId,
          file: testFile,
          line: 3,
        },
      });

      // Continue to hit the breakpoint
      await sendRequest('tools/call', {
        name: 'debugger_continue',
        arguments: {
          sessionId,
        },
      });

      // Wait for breakpoint to be hit
      await new Promise((resolve) => setTimeout(resolve, 500));
    }, 15000);

    it('should set a breakpoint', async () => {
      const result = await sendRequest('tools/call', {
        name: 'debugger_set_breakpoint',
        arguments: {
          sessionId,
          file: testFile,
          line: 4,
        },
      });

      expect(result).toBeDefined();
      const textContent = result.content.find((c: any) => c.type === 'text');
      const response = JSON.parse(textContent.text);

      expect(response.status).toBe('success');
      expect(response.breakpointId).toBeDefined();
      expect(response.file).toBe(testFile);
      expect(response.line).toBe(4);
    }, 10000);

    it('should continue execution', async () => {
      const result = await sendRequest('tools/call', {
        name: 'debugger_continue',
        arguments: {
          sessionId,
        },
      });

      expect(result).toBeDefined();
      const textContent = result.content.find((c: any) => c.type === 'text');
      const response = JSON.parse(textContent.text);

      expect(response.status).toBe('success');
      expect(response.state).toBeDefined();

      // Wait for the process to hit the next breakpoint
      await new Promise((resolve) => setTimeout(resolve, 500));
    }, 10000);

    it('should step over', async () => {
      const result = await sendRequest('tools/call', {
        name: 'debugger_step_over',
        arguments: {
          sessionId,
        },
      });

      expect(result).toBeDefined();
      const textContent = result.content.find((c: any) => c.type === 'text');
      const response = JSON.parse(textContent.text);

      if (response.status === 'error') {
        console.error('Step over error:', response);
      }
      expect(response.status).toBe('success');
      expect(response.state).toBeDefined();
      if (response.location) {
        expect(response.location.file).toBeDefined();
        expect(response.location.line).toBeDefined();
      }
    }, 10000);

    it('should inspect variables', async () => {
      const result = await sendRequest('tools/call', {
        name: 'debugger_inspect',
        arguments: {
          sessionId,
          expression: '1 + 1',
        },
      });

      expect(result).toBeDefined();
      const textContent = result.content.find((c: any) => c.type === 'text');
      const response = JSON.parse(textContent.text);

      if (response.status === 'error') {
        console.error('Inspect error:', response);
      }
      expect(response.status).toBe('success');
      expect(response.expression).toBe('1 + 1');
      expect(response.value).toBe(2);
      expect(response.type).toBeDefined();
    }, 10000);

    it('should get call stack', async () => {
      const result = await sendRequest('tools/call', {
        name: 'debugger_get_stack',
        arguments: {
          sessionId,
        },
      });

      expect(result).toBeDefined();
      const textContent = result.content.find((c: any) => c.type === 'text');
      const response = JSON.parse(textContent.text);

      if (response.status === 'error') {
        console.error('Get stack error:', response);
      }
      expect(response.status).toBe('success');
      expect(response.stack).toBeDefined();
      expect(Array.isArray(response.stack)).toBe(true);

      if (response.stack.length > 0) {
        const frame = response.stack[0];
        expect(frame.file).toBeDefined();
        expect(frame.line).toBeDefined();
        expect(path.isAbsolute(frame.file)).toBe(true); // Requirement 9.4
      }
    }, 10000);
  });

  describe('Error Handling', () => {
    it('should return error for invalid session', async () => {
      const result = await sendRequest('tools/call', {
        name: 'debugger_continue',
        arguments: {
          sessionId: 'invalid-session-id',
        },
      });

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);

      const textContent = result.content.find((c: any) => c.type === 'text');
      const response = JSON.parse(textContent.text);

      expect(response.status).toBe('error');
      expect(response.code).toBe('SESSION_NOT_FOUND');
      expect(response.message).toBeDefined();
    });

    it('should return error for missing required parameters', async () => {
      try {
        await sendRequest('tools/call', {
          name: 'debugger_start',
          arguments: {
            // Missing required 'command' parameter
            timeout: 5000,
          },
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should return error for invalid tool name', async () => {
      const result = await sendRequest('tools/call', {
        name: 'invalid_tool_name',
        arguments: {},
      });

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);

      const textContent = result.content.find((c: any) => c.type === 'text');
      expect(textContent).toBeDefined();
      expect(textContent.text).toContain('invalid_tool_name');
    });

    it('should have proper error structure', async () => {
      const result = await sendRequest('tools/call', {
        name: 'debugger_continue',
        arguments: {
          sessionId: 'nonexistent',
        },
      });

      expect(result.isError).toBe(true);
      const textContent = result.content.find((c: any) => c.type === 'text');
      const response = JSON.parse(textContent.text);

      // Verify error structure per Requirement 9.2
      expect(response.status).toBe('error');
      expect(response.code).toBeDefined();
      expect(response.message).toBeDefined();
    });
  });
});
