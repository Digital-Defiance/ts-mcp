# MCP Debugger Tool

A Model Context Protocol (MCP) server that provides advanced debugging capabilities for Node.js and TypeScript applications, enabling AI agents to interactively debug code through breakpoints, variable inspection, execution control, and hang detection.

## 🎯 Project Vision

This project aims to revolutionize how AI agents debug code by providing a comprehensive debugging interface through the Model Context Protocol. Instead of relying solely on console.log statements and static code analysis, AI agents can now:

- Set and manage breakpoints programmatically
- Inspect variables and evaluate expressions at runtime
- Step through code execution (step over, into, out)
- Detect hanging processes and infinite loops
- Debug TypeScript code using source maps
- Integrate seamlessly with test frameworks (Jest, Mocha, Vitest)

## 📦 Packages

This is an Nx monorepo containing two main packages:

### `@digitaldefiance/ts-mcp-core`
Core debugging functionality built on Node.js Inspector Protocol (Chrome DevTools Protocol).

**Location:** `packages/debugger-core/`

**Responsibilities:**
- Inspector Protocol client (WebSocket connection to Node.js debugger)
- Debug session management
- Breakpoint management
- Execution control (continue, step, pause)
- Variable inspection and expression evaluation
- Call stack operations
- Hang detection and infinite loop detection
- Source map support for TypeScript debugging

### `@digitaldefiance/ts-mcp-server`
MCP server implementation that exposes debugging tools to AI agents.

**Location:** `packages/mcp-server/`

**Responsibilities:**
- MCP protocol implementation
- Tool definitions and handlers
- Integration with debugger-core
- Error handling and response formatting
- Session lifecycle management

## 🚀 Current Status

### ✅ Completed (Tasks 2-9)
- [x] Project structure setup with Nx monorepo
- [x] Package scaffolding (debugger-core, mcp-server)
- [x] Requirements document (EARS format with 9 requirements, 44 acceptance criteria)
- [x] Design document (22 correctness properties, architecture, testing strategy)
- [x] Implementation plan (18 major tasks with subtasks)
- [x] **Inspector Protocol client** - WebSocket connection, CDP commands, event handling
- [x] **Process spawning** - Node.js with inspector attachment and source map support
- [x] **Session management** - Multi-session support with isolation
- [x] **Breakpoint management** - CRUD operations, conditional breakpoints, CDP integration
- [x] **Execution control** - Continue, step operations (over/into/out), pause
- [x] **Variable inspection** - Expression evaluation, object inspection, variable watching
- [x] **Call stack operations** - Stack retrieval, frame navigation, absolute paths
- [x] **Hang detection** - Timeout-based and sampling-based infinite loop detection

### 🔄 In Progress (Tasks 10-12)
- [x] **Source map support** - Loading and location mapping (90% complete)
- [ ] Variable name mapping for TypeScript debugging
- [ ] Test framework integration (Jest, Mocha, Vitest)
- [ ] MCP tools implementation (10 debugging tools)

### 📋 Planned (Tasks 13-18)
- [ ] Error handling and cleanup
- [ ] MCP server setup and tool registration
- [ ] Integration tests with real debugging scenarios
- [ ] Property-based testing with fast-check (22 properties)
- [ ] Documentation and examples
- [ ] MCP configuration for Kiro IDE

### 🎯 Progress Summary
**Core Implementation: 75% Complete (9/12 core tasks)**
- Inspector Protocol ✅
- Session Management ✅
- Breakpoint Operations ✅
- Execution Control ✅
- Variable Inspection ✅
- Call Stack Operations ✅
- Hang Detection ✅
- Source Maps 🔄 (90%)
- Test Framework Integration ⏳
- MCP Tools ⏳
- Error Handling ⏳
- Server Setup ⏳

## 🏗️ Architecture

```
┌─────────────────┐
│   AI Agent      │
│   (Kiro)        │
└────────┬────────┘
         │ MCP Protocol
         │
┌────────▼────────────────┐
│  MCP Debugger Server    │
│  (@ts-mcp-server)       │
└────────┬────────────────┘
         │
┌────────▼────────────────┐
│  Debugger Core          │
│  (@ts-mcp-core)         │
└────────┬────────────────┘
         │ Inspector Protocol (CDP)
         │
┌────────▼────────────────┐
│   Node.js Process       │
│   (Target Application)  │
└─────────────────────────┘
```

## 🛠️ MCP Tools

The server exposes the following debugging tools to AI agents:

| Tool | Description |
|------|-------------|
| `debugger_start` | Start a process with debugger attached |
| `debugger_set_breakpoint` | Set a breakpoint at a specific file and line |
| `debugger_continue` | Continue execution until next breakpoint |
| `debugger_step_over` | Execute next line without entering functions |
| `debugger_step_into` | Step into function calls |
| `debugger_step_out` | Step out of current function |
| `debugger_pause` | Pause execution at current point |
| `debugger_inspect` | Inspect variables and evaluate expressions |
| `debugger_get_stack` | Get current call stack |
| `debugger_detect_hang` | Run command and detect if it hangs |

## 📊 Implementation Plan

The implementation is organized into 18 major tasks:

1. **Project Setup** - Dependencies, TypeScript config, testing framework
2. **Inspector Protocol Client** - WebSocket connection, CDP commands, event handling
3. **Process Spawning** - Launch Node.js with inspector enabled
4. **Session Management** - Track multiple debug sessions with isolation
5. **Breakpoint Management** - CRUD operations for breakpoints
6. **Execution Control** - Continue, step operations, pause
7. **Variable Inspection** - Expression evaluation, object inspection, watches
8. **Call Stack Operations** - Stack retrieval and frame navigation
9. **Hang Detection** - Timeout-based and sampling-based detection
10. **Source Map Support** - TypeScript debugging with location mapping
11. **Test Framework Integration** - Jest, Mocha, Vitest support
12. **MCP Tools** - Implement all 10 debugging tools
13. **Error Handling** - Crash detection, cleanup, error formatting
14. **MCP Server Setup** - Server initialization and tool registration
15. **Testing Checkpoint** - Ensure all tests pass
16. **Integration Tests** - End-to-end testing with fixtures
17. **Configuration & Documentation** - MCP config, README, API docs
18. **Final Checkpoint** - Comprehensive testing

See [tasks.md](.kiro/specs/mcp-debugger-tool/tasks.md) for detailed task breakdown.

## 🧪 Testing Strategy

### Property-Based Testing
Using `fast-check` library to verify 22 correctness properties across all inputs:
- Breakpoint operations consistency
- Expression evaluation correctness
- Session isolation
- Source map round-trip consistency
- Error handling without crashes
- Response format consistency

### Unit Tests
Testing individual components:
- CDP command formatting
- Source map resolution
- Breakpoint management
- Session lifecycle
- Object serialization

### Integration Tests
End-to-end scenarios:
- Debugging simple Node.js scripts
- TypeScript debugging with source maps
- Jest test debugging
- Hang detection with infinite loops

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- Yarn (workspace support)
- TypeScript 5+

### Installation

```bash
# Install dependencies
yarn install

# Build all packages
npx nx run-many -t build

# Run tests
npx nx run-many -t test
```

### Development

```bash
# Build debugger-core
npx nx build debugger-core

# Build mcp-server
npx nx build mcp-server

# Run tests for specific package
npx nx test debugger-core
npx nx test mcp-server

# Watch mode for development
npx nx build debugger-core --watch
```

## 📖 Documentation

- [Requirements Document](.kiro/specs/mcp-debugger-tool/requirements.md) - EARS-formatted requirements with acceptance criteria
- [Design Document](.kiro/specs/mcp-debugger-tool/design.md) - Architecture, correctness properties, testing strategy
- [Implementation Plan](.kiro/specs/mcp-debugger-tool/tasks.md) - Detailed task breakdown with property test mappings

## 🎯 Milestones

### Milestone 1: Core Debugging ✅ **COMPLETED**
- [x] Inspector Protocol client
- [x] Basic session management
- [x] Breakpoint operations
- [x] Variable inspection
- [x] Execution control

### Milestone 2: Advanced Features 🔄 **IN PROGRESS (75%)**
- [x] Hang detection
- [x] Source map support (location mapping)
- [ ] Source map variable name mapping
- [ ] Test framework integration
- [x] Call stack operations

### Milestone 3: MCP Integration ⏳ **NEXT**
- [ ] MCP server implementation
- [ ] All tool handlers (10 tools)
- [ ] Error handling
- [ ] Response formatting

### Milestone 4: Testing & Polish ⏳ **PLANNED**
- [ ] Property-based tests (22 properties)
- [ ] Integration tests
- [ ] Documentation
- [ ] MCP configuration

## 🤝 Contributing

This project follows a spec-driven development approach:

1. All requirements are documented in EARS format
2. Design includes formal correctness properties
3. Implementation follows the detailed task plan
4. Each property has corresponding property-based tests
5. All code changes must pass tests before merging

## 📄 License

[Add your license here]

## 🔗 Related Projects

- [Model Context Protocol](https://modelcontextprotocol.io/) - Protocol specification
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) - Inspector Protocol documentation
- [Nx](https://nx.dev) - Monorepo build system

## 📞 Contact

[Add contact information or links]

---

**Built with ❤️ using Nx, TypeScript, and the Model Context Protocol**
