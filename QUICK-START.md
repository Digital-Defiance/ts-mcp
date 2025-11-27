# Quick Start - TypeScript MCP Debugger

## Option 1: NPM Install (Recommended)
```bash
npm install -g @digitaldefiance/ts-mcp-server
```

Add to your MCP config:
```json
{
  "servers": {
    "ts-mcp": {
      "command": "ts-mcp-server"
    }
  }
}
```

## Option 2: Docker
```bash
docker run -p 3000:3000 digitaldefiance/ts-mcp-server
```

## Option 3: Direct Download
```bash
curl -L https://github.com/digitaldefiance/ts-mcp/releases/latest/download/ts-mcp-server.tar.gz | tar xz
node ts-mcp-server/index.js
```

## Available Tools
- `debugger_start` - Start debugging
- `debugger_set_breakpoint` - Set breakpoints  
- `debugger_inspect` - Inspect variables
- `debugger_start_cpu_profile` - Performance profiling
- `debugger_detect_hang` - Detect infinite loops
- ...and 20+ more debugging tools

## Example Usage
Ask your AI: "Debug my Node.js app and set a breakpoint on line 42 of app.js"