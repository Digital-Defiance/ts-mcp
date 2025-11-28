#!/usr/bin/env node

/**
 * CLI entry point for ts-mcp-server
 * Enables global installation via npm install -g @digitaldefiance/ts-mcp-server
 */

import { startServer } from './index.js';

// Start the MCP server
startServer().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});