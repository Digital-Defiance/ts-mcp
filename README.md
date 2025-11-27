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

### ✅ Completed (Tasks 1-20)
- [x] Project structure setup with Nx monorepo
- [x] Package scaffolding (debugger-core, mcp-server)
- [x] Requirements document (EARS format with 9 requirements, 44 acceptance criteria)
- [x] Design document (22 correctness properties, architecture, testing strategy)
- [x] Implementation plan (30 major tasks with subtasks)
- [x] **Inspector Protocol client** - WebSocket connection, CDP commands, event handling
- [x] **Process spawning** - Node.js with inspector attachment and source map support
- [x] **Session management** - Multi-session support with isolation
- [x] **Breakpoint management** - CRUD operations, conditional breakpoints, CDP integration
- [x] **Execution control** - Continue, step operations (over/into/out), pause
- [x] **Variable inspection** - Expression evaluation, object inspection, variable watching
- [x] **Call stack operations** - Stack retrieval, frame navigation, absolute paths
- [x] **Hang detection** - Timeout-based and sampling-based infinite loop detection
- [x] **Source map support** - Loading, location mapping, variable name preservation
- [x] **Test framework integration** - Jest, Mocha, Vitest support with output capture
- [x] **MCP tools (17 core tools)** - All basic debugging operations
- [x] **Error handling and cleanup** - Crash detection, resource cleanup, error formatting
- [x] **MCP server setup** - Server initialization, tool registration, lifecycle management
- [x] **E2E testing** - Protocol tests, tool execution tests, error handling tests
- [x] **Advanced breakpoint types** - Logpoints, exception breakpoints, hit count breakpoints, function breakpoints
- [x] **Audit logging** - Structured logging with timestamps, session context, JSON export

### 🔄 In Progress (Tasks 21-27)
- [ ] Security and compliance features (authentication, rate limiting, PII masking)
- [ ] Observability and telemetry (structured logging, metrics, health checks)
- [ ] Performance profiling (CPU profiling, memory profiling, performance timeline)
- [ ] Production readiness (graceful shutdown, circuit breakers, retry logic)
- [ ] Enhanced testing (load testing, chaos testing, compatibility testing)
- [ ] Developer experience enhancements (configuration presets, workspace-aware debugging)
- [ ] Final enterprise checkpoint

### 📋 Planned (Tasks 28-30)
- [ ] Docker MCP Registry contribution
- [ ] VS Code and GitHub Copilot integration
- [ ] Optional long-term soak testing

### 🎯 Progress Summary
**Core Implementation: 100% Complete (20/20 core tasks)**
**Enterprise Features: 0% Complete (0/7 enterprise tasks)**
**Overall Progress: 67% Complete (20/30 total tasks)**

- Inspector Protocol ✅
- Session Management ✅
- Breakpoint Operations ✅
- Execution Control ✅
- Variable Inspection ✅
- Call Stack Operations ✅
- Hang Detection ✅
- Source Maps ✅
- Test Framework Integration ✅
- MCP Tools (25 total) ✅
- Error Handling ✅
- Server Setup ✅
- E2E Testing ✅
- Advanced Breakpoints ✅
- Audit Logging ✅
- Security Features ⏳
- Observability ⏳
- Performance Profiling ⏳
- Production Readiness ⏳

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

The server exposes 25 debugging tools to AI agents:

### Core Debugging Tools (17)
| Tool | Description |
|------|-------------|
| `debugger_start` | Start a process with debugger attached |
| `debugger_set_breakpoint` | Set a breakpoint at a specific file and line |
| `debugger_continue` | Continue execution until next breakpoint |
| `debugger_step_over` | Execute next line without entering functions |
| `debugger_step_into` | Step into function calls |
| `debugger_step_out` | Step out of current function |
| `debugger_pause` | Pause execution at current point |
| `debugger_remove_breakpoint` | Remove a breakpoint by ID |
| `debugger_toggle_breakpoint` | Enable/disable a breakpoint |
| `debugger_list_breakpoints` | List all breakpoints in a session |
| `debugger_inspect` | Evaluate expressions in current context |
| `debugger_get_local_variables` | Get local variables in current scope |
| `debugger_get_global_variables` | Get global variables |
| `debugger_inspect_object` | Inspect object properties with depth control |
| `debugger_add_watch` | Add a watched expression |
| `debugger_remove_watch` | Remove a watched expression |
| `debugger_get_watches` | Get all watched expressions with values |
| `debugger_get_stack` | Get current call stack with absolute paths |
| `debugger_switch_stack_frame` | Switch context to different stack frame |
| `debugger_stop_session` | Stop debug session and cleanup |
| `debugger_detect_hang` | Run command and detect if it hangs |

### Advanced Breakpoint Tools (4)
| Tool | Description |
|------|-------------|
| `debugger_set_logpoint` | Set a logpoint that logs without pausing (supports {variable} interpolation) |
| `debugger_set_exception_breakpoint` | Break on caught/uncaught exceptions with optional filtering |
| `debugger_set_function_breakpoint` | Break when a function is called (supports regex patterns) |
| `debugger_set_hit_count_condition` | Set hit count condition for breakpoints (==, >, >=, <, <=, %) |

## 📊 Implementation Plan

The implementation is organized into 30 major tasks:

### Core Implementation (Tasks 1-19) ✅ **COMPLETED**
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
12. **MCP Tools** - Implement all 17 core debugging tools
13. **Error Handling** - Crash detection, cleanup, error formatting
14. **MCP Server Setup** - Server initialization and tool registration
15. **Missing MCP Tools** - Complete tool coverage for all features
16. **Expanded E2E Tests** - Comprehensive coverage of all tools
17. **Test Fixtures** - Integration test scenarios
18. **MCP Configuration** - Kiro integration, documentation
19. **Final Checkpoint** - All core tests passing

### Advanced Features (Task 20) ✅ **COMPLETED**
20. **Advanced Breakpoint Types**
    - Logpoints (non-breaking breakpoints with logging)
    - Exception breakpoints (caught/uncaught with filtering)
    - Hit count breakpoints (conditional on hit count)
    - Function breakpoints (break on function entry)
    - Audit logging (structured operation logging)

### Enterprise Features (Tasks 21-27) ⏳ **PLANNED**
21. **Security & Compliance** - Authentication, rate limiting, PII masking, session timeouts
22. **Observability & Telemetry** - Structured logging, metrics, health checks, session recording
23. **Performance Profiling** - CPU profiling, memory profiling, performance timeline
24. **Production Readiness** - Graceful shutdown, circuit breakers, retry logic, resource limits
25. **Enhanced Testing** - Load testing, chaos testing, compatibility testing, security testing
26. **Developer Experience** - Configuration presets, workspace-aware debugging, multi-target debugging
27. **Final Enterprise Checkpoint** - Comprehensive enterprise feature validation

### Community & Integration (Tasks 28-30) ⏳ **PLANNED**
28. **Docker MCP Registry** - Contribution preparation and submission
29. **VS Code & Copilot Integration** - Extension development, LSP/DAP integration
30. **Optional Soak Testing** - Long-term stability validation

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

### Milestone 2: Advanced Features ✅ **COMPLETED**
- [x] Hang detection
- [x] Source map support (location mapping)
- [x] Source map variable name mapping
- [x] Test framework integration
- [x] Call stack operations

### Milestone 3: MCP Integration ✅ **COMPLETED**
- [x] MCP server implementation
- [x] All tool handlers (25 tools)
- [x] Error handling
- [x] Response formatting

### Milestone 4: Testing & Polish ✅ **COMPLETED**
- [x] Property-based tests (22 properties)
- [x] Integration tests
- [x] E2E tests
- [x] Documentation
- [x] MCP configuration

### Milestone 5: Advanced Breakpoints ✅ **COMPLETED**
- [x] Logpoints (non-breaking breakpoints)
- [x] Exception breakpoints
- [x] Hit count breakpoints
- [x] Function breakpoints
- [x] Audit logging

### Milestone 6: Enterprise Features ⏳ **NEXT**
- [ ] Security and compliance
- [ ] Observability and telemetry
- [ ] Performance profiling
- [ ] Production readiness
- [ ] Enhanced testing

### Milestone 7: Community Integration ⏳ **PLANNED**
- [ ] Docker MCP Registry contribution
- [ ] VS Code extension
- [ ] GitHub Copilot integration

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
