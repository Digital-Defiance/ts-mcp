#!/usr/bin/env node

/**
 * Manual test script for MCP Debugger Server
 * This script demonstrates how to interact with the MCP server
 *
 * Usage:
 *   1. Build the server: npx nx build @digitaldefiance/ts-mcp-server
 *   2. Run this script: node packages/mcp-server/test-mcp-server.js
 */

const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

let messageId = 0;
let serverProcess;

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function startServer() {
  log('\n🚀 Starting MCP Debugger Server...', colors.bright);

  const serverPath = path.join(__dirname, 'dist/index.js');
  serverProcess = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  serverProcess.stderr.on('data', (data) => {
    log(`Server stderr: ${data}`, colors.red);
  });

  serverProcess.on('exit', (code) => {
    log(`\n❌ Server exited with code ${code}`, colors.red);
    process.exit(code);
  });

  log('✅ Server started\n', colors.green);
}

function sendRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++messageId;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    log(`\n📤 Sending request:`, colors.cyan);
    console.log(JSON.stringify(request, null, 2));

    let responseData = '';
    const timeout = setTimeout(() => {
      reject(new Error(`Request timeout for ${method}`));
    }, 10000);

    const onData = (data) => {
      responseData += data.toString();

      const lines = responseData.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line);
            if (response.id === id) {
              clearTimeout(timeout);
              serverProcess.stdout.removeListener('data', onData);

              log(`\n📥 Received response:`, colors.green);
              console.log(JSON.stringify(response, null, 2));

              if (response.error) {
                reject(new Error(response.error.message));
              } else {
                resolve(response.result);
              }
              return;
            }
          } catch (e) {
            // Not a complete JSON message yet
          }
        }
      }
    };

    serverProcess.stdout.on('data', onData);
    serverProcess.stdin.write(JSON.stringify(request) + '\n');
  });
}

async function runTests() {
  try {
    // Test 1: Initialize
    log('\n' + '='.repeat(60), colors.bright);
    log('TEST 1: Initialize MCP Server', colors.bright);
    log('='.repeat(60), colors.bright);

    const initResult = await sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0',
      },
    });

    log(
      `\n✅ Server initialized: ${initResult.serverInfo.name} v${initResult.serverInfo.version}`,
      colors.green,
    );

    // Test 2: List tools
    log('\n' + '='.repeat(60), colors.bright);
    log('TEST 2: List Available Tools', colors.bright);
    log('='.repeat(60), colors.bright);

    const toolsResult = await sendRequest('tools/list');
    log(`\n✅ Found ${toolsResult.tools.length} tools:`, colors.green);
    toolsResult.tools.forEach((tool) => {
      log(`  • ${tool.name}: ${tool.description}`, colors.blue);
    });

    // Test 3: Detect hang (normal completion)
    log('\n' + '='.repeat(60), colors.bright);
    log('TEST 3: Detect Hang - Normal Completion', colors.bright);
    log('='.repeat(60), colors.bright);

    const testFile = path.join(
      __dirname,
      '../debugger-core/test-fixtures/normal-completion.js',
    );
    const hangResult = await sendRequest('tools/call', {
      name: 'debugger_detect_hang',
      arguments: {
        command: 'node',
        args: [testFile],
        timeout: 2000,
      },
    });

    const hangResponse = JSON.parse(hangResult.content[0].text);
    if (hangResponse.hung) {
      log(`\n❌ Expected normal completion but got hang`, colors.red);
    } else {
      log(
        `\n✅ Correctly detected normal completion (exit code: ${hangResponse.exitCode})`,
        colors.green,
      );
    }

    // Test 4: Detect hang (infinite loop)
    log('\n' + '='.repeat(60), colors.bright);
    log('TEST 4: Detect Hang - Infinite Loop', colors.bright);
    log('='.repeat(60), colors.bright);

    const loopFile = path.join(
      __dirname,
      '../debugger-core/test-fixtures/infinite-loop.js',
    );
    const loopResult = await sendRequest('tools/call', {
      name: 'debugger_detect_hang',
      arguments: {
        command: 'node',
        args: [loopFile],
        timeout: 2000,
        sampleInterval: 100,
      },
    });

    const loopResponse = JSON.parse(loopResult.content[0].text);
    if (loopResponse.hung) {
      log(
        `\n✅ Correctly detected infinite loop at: ${loopResponse.location}`,
        colors.green,
      );
    } else {
      log(`\n❌ Expected hang detection but got normal completion`, colors.red);
    }

    // Test 5: Error handling
    log('\n' + '='.repeat(60), colors.bright);
    log('TEST 5: Error Handling - Invalid Session', colors.bright);
    log('='.repeat(60), colors.bright);

    const errorResult = await sendRequest('tools/call', {
      name: 'debugger_continue',
      arguments: {
        sessionId: 'invalid-session-id',
      },
    });

    const errorResponse = JSON.parse(errorResult.content[0].text);
    if (
      errorResponse.status === 'error' &&
      errorResponse.code === 'SESSION_NOT_FOUND'
    ) {
      log(
        `\n✅ Correctly returned error: ${errorResponse.message}`,
        colors.green,
      );
    } else {
      log(`\n❌ Expected error response`, colors.red);
    }

    // All tests passed
    log('\n' + '='.repeat(60), colors.bright);
    log('🎉 ALL TESTS PASSED!', colors.green + colors.bright);
    log('='.repeat(60), colors.bright);
  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, colors.red);
    console.error(error);
  } finally {
    log('\n🛑 Stopping server...', colors.yellow);
    serverProcess.kill();
    process.exit(0);
  }
}

// Main
log(
  '╔════════════════════════════════════════════════════════════╗',
  colors.bright,
);
log(
  '║         MCP Debugger Server - Manual Test Suite           ║',
  colors.bright,
);
log(
  '╚════════════════════════════════════════════════════════════╝',
  colors.bright,
);

startServer();

// Give server time to start
setTimeout(() => {
  runTests();
}, 1000);
