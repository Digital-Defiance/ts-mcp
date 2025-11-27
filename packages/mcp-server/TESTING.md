# MCP Debugger Server - Testing Guide

This document describes how to test the MCP Debugger Server end-to-end.

## Testing Methods

### 1. Unit Tests (Property-Based Tests)

Run the unit tests that verify response format consistency:

```bash
npx nx test @digitaldefiance/ts-mcp-server
```

These tests use property-based testing (fast-check) to verify that all tool responses follow the correct format with 100+ test cases per property.

### 2. Manual Testing Script

The manual testing script demonstrates real MCP protocol communication:

```bash
# Step 1: Build the server
npx nx build @digitaldefiance/ts-mcp-server

# Step 2: Run the test script
node packages/mcp-server/test-mcp-server.js
```

This script will:
- ✅ Start the MCP server
- ✅ Initialize the MCP protocol
- ✅ List all available tools
- ✅ Test hang detection with normal completion
- ✅ Test hang detection with infinite loop
- ✅ Test error handling

### 3. E2E Tests (Jest)

Run the full E2E test suite:

```bash
npx nx test @digitaldefiance/ts-mcp-server --testPathPattern=e2e
```

These tests:
- Start the actual MCP server as a child process
- Communicate via stdio using JSON-RPC
- Test all MCP protocol methods (initialize, tools/list, tools/call)
- Verify tool execution and error handling

### 4. Testing with MCP Inspector

You can also test the server using the official MCP Inspector tool:

```bash
# Install MCP Inspector
npm install -g @modelcontextprotocol/inspector

# Build the server
npx nx build @digitaldefiance/ts-mcp-server

# Run the inspector
mcp-inspector node packages/mcp-server/dist/index.js
```

This will open a web UI where you can:
- See all available tools
- Call tools with custom parameters
- View responses in real-time
- Debug MCP protocol communication

### 5. Integration with Kiro

To test the server with Kiro:

1. Build the server:
   ```bash
   npx nx build @digitaldefiance/ts-mcp-server
   ```

2. Add to your `.kiro/settings/mcp.json`:
   ```json
   {
     "mcpServers": {
       "debugger": {
         "command": "node",
         "args": ["/absolute/path/to/packages/mcp-server/dist/index.js"],
         "disabled": false
       }
     }
   }
   ```

3. Restart Kiro or reconnect the MCP server

4. Test by asking Kiro to use the debugger tools

## Available Tools

The MCP server provides these tools:

1. **debugger_start** - Start a debug session
2. **debugger_set_breakpoint** - Set breakpoints
3. **debugger_continue** - Resume execution
4. **debugger_step_over** - Step over current line
5. **debugger_inspect** - Evaluate expressions
6. **debugger_get_stack** - Get call stack
7. **debugger_detect_hang** - Detect hanging processes

## Test Fixtures

Test fixtures are located in `packages/debugger-core/test-fixtures/`:

- `normal-completion.js` - Script that completes normally
- `infinite-loop.js` - Script with infinite loop
- `simple-script.js` - Basic script for debugging
- `step-test.js` - Script for testing step operations
- `watch-test.js` - Script for testing variable watching

## Troubleshooting

### Server won't start

- Make sure you've built the server: `npx nx build @digitaldefiance/ts-mcp-server`
- Check that Node.js version is compatible (v16+)
- Look for error messages in stderr

### Tests timeout

- Increase timeout values in test configuration
- Check that test fixtures exist
- Verify debugger-core is built: `npx nx build @digitaldefiance/ts-mcp-core`

### MCP protocol errors

- Verify JSON-RPC message format
- Check that stdio communication is working
- Use MCP Inspector to debug protocol issues

## CI/CD Integration

To run tests in CI:

```bash
# Run all tests
npx nx test @digitaldefiance/ts-mcp-server

# Run with coverage
npx nx test @digitaldefiance/ts-mcp-server --coverage

# Run only E2E tests
npx nx test @digitaldefiance/ts-mcp-server --testPathPattern=e2e
```
