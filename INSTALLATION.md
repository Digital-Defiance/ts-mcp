# Installation Guide - TypeScript MCP Debugger

Multiple installation methods available for different use cases and platforms.

## 🚀 Quick Install (Recommended)

### NPM Global Installation
```bash
npm install -g @digitaldefiance/ts-mcp-server
```

Then add to your MCP configuration:
```json
{
  "servers": {
    "ts-mcp": {
      "command": "ts-mcp-server"
    }
  }
}
```

## 📦 All Installation Methods

### 1. NPM Package Manager
```bash
# Global installation (recommended)
npm install -g @digitaldefiance/ts-mcp-server

# Or local installation
npm install @digitaldefiance/ts-mcp-server
npx ts-mcp-server
```

### 2. Docker Container
```bash
# Pull and run
docker pull digitaldefiance/ts-mcp-server
docker run -d --name ts-mcp digitaldefiance/ts-mcp-server

# Or use docker-compose
curl -O https://raw.githubusercontent.com/digitaldefiance/ts-mcp/main/docker-compose.yml
docker-compose up -d
```

### 3. Direct Binary Download
```bash
# Linux
curl -L https://github.com/digitaldefiance/ts-mcp/releases/latest/download/ts-mcp-server-linux-x64 -o ts-mcp-server
chmod +x ts-mcp-server
sudo mv ts-mcp-server /usr/local/bin/

# macOS
curl -L https://github.com/digitaldefiance/ts-mcp/releases/latest/download/ts-mcp-server-darwin-x64 -o ts-mcp-server
chmod +x ts-mcp-server
sudo mv ts-mcp-server /usr/local/bin/

# Windows (PowerShell as Administrator)
Invoke-WebRequest -Uri "https://github.com/digitaldefiance/ts-mcp/releases/latest/download/ts-mcp-server-win32-x64.exe" -OutFile "ts-mcp-server.exe"
Move-Item ts-mcp-server.exe "C:\Program Files\ts-mcp-server\"
```

### 4. Package Managers

#### Homebrew (macOS)
```bash
# Add tap (once available)
brew tap digitaldefiance/ts-mcp
brew install ts-mcp-server
```

#### Chocolatey (Windows)
```bash
# Once available
choco install ts-mcp-server
```

#### APT (Ubuntu/Debian)
```bash
# Once available
curl -fsSL https://packages.digitaldefiance.org/gpg | sudo apt-key add -
echo "deb https://packages.digitaldefiance.org/apt stable main" | sudo tee /etc/apt/sources.list.d/digitaldefiance.list
sudo apt update
sudo apt install ts-mcp-server
```

### 5. VS Code Extension
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "TypeScript MCP Debugger"
4. Click Install
5. Extension automatically configures MCP server

## 🔧 Configuration

### For Kiro/Amazon Q
Add to your MCP configuration file:

```json
{
  "servers": {
    "ts-mcp": {
      "command": "ts-mcp-server",
      "args": [],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### For Other MCP Clients
```json
{
  "name": "ts-mcp",
  "command": "ts-mcp-server",
  "args": [],
  "description": "Advanced TypeScript/Node.js debugging with 25+ tools"
}
```

## ✅ Verify Installation

Test that the server is working:

```bash
# Check version
ts-mcp-server --version

# Test MCP connection (if supported)
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | ts-mcp-server
```

## 🛠️ Available Tools

Once installed, you'll have access to 25+ debugging tools:

### Core Debugging (17 tools)
- `debugger_start` - Start debugging session
- `debugger_set_breakpoint` - Set breakpoints with conditions
- `debugger_continue` - Continue execution
- `debugger_step_over/into/out` - Step through code
- `debugger_pause` - Pause execution
- `debugger_inspect` - Evaluate expressions
- `debugger_get_local_variables` - Get local variables
- `debugger_get_stack` - Get call stack
- And more...

### Advanced Features (8 tools)
- `debugger_set_logpoint` - Non-breaking log breakpoints
- `debugger_set_exception_breakpoint` - Break on exceptions
- `debugger_start_cpu_profile` - CPU performance profiling
- `debugger_take_heap_snapshot` - Memory analysis
- `debugger_detect_hang` - Infinite loop detection
- And more...

## 🚨 Troubleshooting

### Common Issues

**Command not found after NPM install:**
```bash
# Check NPM global bin directory
npm config get prefix
# Add to PATH if needed
export PATH=$PATH:$(npm config get prefix)/bin
```

**Permission denied on Linux/macOS:**
```bash
# Fix NPM permissions
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
```

**Docker container won't start:**
```bash
# Check logs
docker logs ts-mcp-server
# Ensure proper permissions
docker run --user $(id -u):$(id -g) digitaldefiance/ts-mcp-server
```

**MCP connection fails:**
- Ensure the command path is correct in your MCP config
- Check that Node.js 18+ is installed
- Verify the server starts without errors

### Getting Help

- 📖 [Full Documentation](https://github.com/digitaldefiance/ts-mcp)
- 🐛 [Report Issues](https://github.com/digitaldefiance/ts-mcp/issues)
- 💬 [Discussions](https://github.com/digitaldefiance/ts-mcp/discussions)
- 📧 [Email Support](mailto:info@digitaldefiance.org)

## 🔄 Updates

### NPM
```bash
npm update -g @digitaldefiance/ts-mcp-server
```

### Docker
```bash
docker pull digitaldefiance/ts-mcp-server:latest
docker-compose pull && docker-compose up -d
```

### Binary
Download the latest release from GitHub and replace the existing binary.

---

**Next Steps:** See [QUICK-START.md](./QUICK-START.md) for usage examples and debugging workflows.