# MCP Debugger Tool - Implementation Plan

- [ ] 1. Set up project structure and core interfaces
  - Create directory structure for MCP server, inspector client, session manager, and tool implementations
  - Initialize package.json with MCP SDK, WebSocket, and TypeScript dependencies
  - Configure TypeScript with appropriate compiler options
  - Set up testing framework (Jest) with fast-check for property-based testing
  - _Requirements: 8.2, 9.1_

- [x] 2. Implement Inspector Protocol client
  - [x] 2.1 Create InspectorClient class with WebSocket connection management
    - Implement connection to Node.js Inspector Protocol via WebSocket
    - Implement CDP message protocol with request/response handling
    - Add event listener system for CDP events
    - Implement disconnect and cleanup logic
    - _Requirements: 2.1, 8.2_

  - [x] 2.2 Write property test for Inspector client connection
    - **Property 5: Process start with inspector attachment**
    - **Validates: Requirements 2.1**

  - [x] 2.3 Implement CDP command sending with timeout handling
    - Create send method that generates unique message IDs
    - Implement promise-based response handling
    - Add timeout mechanism for commands that don't respond
    - Handle CDP error responses
    - _Requirements: 8.3, 8.4_

  - [x] 2.4 Write property test for error handling
    - **Property 18: Error handling without process crash**
    - **Validates: Requirements 8.3, 8.4**

- [x] 3. Implement process spawning with inspector
  - [x] 3.1 Create spawnWithInspector function
    - Spawn Node.js process with --inspect-brk flag
    - Parse inspector WebSocket URL from stderr
    - Handle spawn errors and timeouts
    - Return process handle and inspector URL
    - _Requirements: 2.1_

  - [x] 3.2 Add source map support configuration
    - Enable --enable-source-maps flag when spawning
    - Configure environment variables for source map support
    - _Requirements: 7.1_

- [x] 4. Implement session management
  - [x] 4.1 Create DebugSession class
    - Track session ID, process, inspector client, and state
    - Implement session lifecycle (start, pause, resume, cleanup)
    - Store breakpoints and watched variables per session
    - _Requirements: 8.2, 8.5_

  - [x] 4.2 Create SessionManager class
    - Generate unique session IDs
    - Track multiple concurrent sessions
    - Implement session isolation
    - Provide session lookup and cleanup methods
    - _Requirements: 8.5_

  - [x] 4.3 Write property test for session isolation
    - **Property 19: Debug session isolation**
    - **Validates: Requirements 8.5**

- [-] 5. Implement breakpoint management
  - [ ] 5.1 Create BreakpointManager class
    - Store breakpoint definitions with file, line, and condition
    - Generate unique breakpoint identifiers
    - Track breakpoint state (enabled/disabled)
    - Implement breakpoint CRUD operations
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 5.2 Write property test for breakpoint creation and retrieval
    - **Property 1: Breakpoint creation and retrieval consistency**
    - **Validates: Requirements 1.1, 1.3**

  - [ ] 5.3 Write property test for breakpoint removal
    - **Property 3: Breakpoint removal completeness**
    - **Validates: Requirements 1.4**

  - [ ] 5.4 Write property test for breakpoint toggle
    - **Property 4: Breakpoint toggle preserves identity**
    - **Validates: Requirements 1.5**

  - [ ] 5.5 Implement CDP breakpoint operations
    - Map file paths to script IDs using Debugger.scriptParsed events
    - Set breakpoints using Debugger.setBreakpointByUrl
    - Remove breakpoints using Debugger.removeBreakpoint
    - Handle breakpoint resolution and verification
    - _Requirements: 1.1, 1.4_

  - [ ] 5.6 Write property test for conditional breakpoints
    - **Property 2: Conditional breakpoint evaluation**
    - **Validates: Requirements 1.2**

- [ ] 6. Implement execution control operations
  - [ ] 6.1 Implement continue operation
    - Send Debugger.resume CDP command
    - Update session state to running
    - Handle Debugger.paused events
    - _Requirements: 2.2_

  - [ ] 6.2 Implement step operations
    - Implement step over using Debugger.stepOver
    - Implement step into using Debugger.stepInto
    - Implement step out using Debugger.stepOut
    - Update session state after each step
    - _Requirements: 2.3, 2.4, 2.5_

  - [ ] 6.3 Write property test for step operations
    - **Property 6: Step operations maintain execution flow**
    - **Validates: Requirements 2.3, 2.4, 2.5**

  - [ ] 6.4 Implement pause operation
    - Send Debugger.pause CDP command
    - Update session state to paused
    - Capture current execution location
    - _Requirements: 2.6_

- [ ] 7. Implement variable inspection
  - [ ] 7.1 Implement expression evaluation
    - Get current call frame from paused state
    - Use Debugger.evaluateOnCallFrame to evaluate expressions
    - Handle evaluation errors gracefully
    - Serialize results with type information
    - _Requirements: 3.4, 9.3_

  - [ ] 7.2 Write property test for expression evaluation
    - **Property 8: Expression evaluation correctness**
    - **Validates: Requirements 3.4**

  - [ ] 7.3 Implement object inspection
    - Use Runtime.getProperties to get object properties
    - Handle nested objects and arrays
    - Limit inspection depth to prevent performance issues
    - Include type information in results
    - _Requirements: 3.3, 9.3_

  - [ ] 7.4 Write property test for object inspection
    - **Property 7: Object inspection completeness**
    - **Validates: Requirements 3.3**

  - [ ] 7.5 Write property test for complex object serialization
    - **Property 21: Complex object serialization with type information**
    - **Validates: Requirements 9.3**

  - [ ] 7.6 Implement variable watching
    - Track watched variable names per session
    - Evaluate watched expressions on each pause
    - Detect and report value changes
    - _Requirements: 3.5_

  - [ ] 7.7 Write property test for variable watch notification
    - **Property 9: Variable watch notification**
    - **Validates: Requirements 3.5**

- [ ] 8. Implement call stack operations
  - [ ] 8.1 Implement call stack retrieval
    - Get call stack from Debugger.paused event
    - Format stack frames with function names, files, and line numbers
    - Convert all file paths to absolute paths
    - _Requirements: 4.1, 9.4_

  - [ ] 8.2 Write property test for call stack absolute paths
    - **Property 22: Call stack absolute path requirement**
    - **Validates: Requirements 9.4**

  - [ ] 8.3 Implement stack frame navigation
    - Allow switching context to different stack frames
    - Update current frame for variable inspection
    - Ensure variable inspection uses correct frame scope
    - _Requirements: 4.2, 4.3_

  - [ ] 8.4 Write property test for stack frame context switching
    - **Property 10: Stack frame context switching**
    - **Validates: Requirements 4.2, 4.3**

- [ ] 9. Implement hang detection
  - [ ] 9.1 Create HangDetector class
    - Start debug session with timeout
    - Implement periodic call stack sampling
    - Compare consecutive samples to detect unchanged location
    - Capture hang location and full call stack
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 9.2 Write property test for timeout-based hang detection
    - **Property 11: Timeout-based hang detection**
    - **Validates: Requirements 5.1, 5.2**

  - [ ] 9.3 Write property test for infinite loop detection
    - **Property 12: Infinite loop detection via sampling**
    - **Validates: Requirements 5.3, 5.4**

  - [ ] 9.4 Implement hang detection with configurable sampling
    - Accept sample interval parameter
    - Track execution location history
    - Report infinite loop when location unchanged for duration
    - Clean up resources after detection
    - _Requirements: 5.3, 5.4_

- [ ] 10. Implement source map support
  - [ ] 10.1 Implement source map loading
    - Detect .map files alongside JavaScript files
    - Parse source map JSON format
    - Cache loaded source maps per session
    - _Requirements: 7.1_

  - [ ] 10.2 Implement location mapping
    - Map TypeScript locations to JavaScript for breakpoint setting
    - Map JavaScript locations back to TypeScript when paused
    - Handle missing or invalid source maps gracefully
    - _Requirements: 7.2, 7.3_

  - [ ] 10.3 Write property test for source map round-trip
    - **Property 15: Source map round-trip consistency**
    - **Validates: Requirements 7.2, 7.3**

  - [ ] 10.4 Implement variable name mapping
    - Use source map names section for variable mapping
    - Display TypeScript variable names in inspection results
    - Fall back to JavaScript names if mapping unavailable
    - _Requirements: 7.4_

  - [ ] 10.5 Write property test for variable name preservation
    - **Property 16: Source map variable name preservation**
    - **Validates: Requirements 7.4**

- [ ] 11. Implement test framework integration
  - [ ] 11.1 Implement Jest test execution
    - Spawn Jest with inspector attached
    - Capture test output (stdout/stderr)
    - Parse test results and failures
    - Return structured test results
    - _Requirements: 6.1, 6.4, 6.5_

  - [ ] 11.2 Implement Mocha test execution
    - Spawn Mocha with inspector attached
    - Capture test output
    - Parse test results
    - _Requirements: 6.2, 6.4, 6.5_

  - [ ] 11.3 Implement Vitest test execution
    - Spawn Vitest with inspector attached
    - Capture test output
    - Parse test results
    - _Requirements: 6.3, 6.4, 6.5_

  - [ ] 11.4 Write property test for test output capture
    - **Property 13: Test output capture completeness**
    - **Validates: Requirements 6.4**

  - [ ] 11.5 Write property test for test failure information
    - **Property 14: Test failure information completeness**
    - **Validates: Requirements 6.5**

- [ ] 12. Implement MCP tools
  - [ ] 12.1 Implement debugger_start tool
    - Accept command, args, cwd, and timeout parameters
    - Create new debug session
    - Start process with inspector
    - Return session ID and status
    - _Requirements: 2.1, 9.1_

  - [ ] 12.2 Implement debugger_set_breakpoint tool
    - Accept file, line, and optional condition
    - Validate file path
    - Create breakpoint via BreakpointManager
    - Return breakpoint ID and verification status
    - _Requirements: 1.1, 1.2, 9.1_

  - [ ] 12.3 Implement debugger_continue tool
    - Accept session ID
    - Resume execution in session
    - Return execution status
    - _Requirements: 2.2, 9.1_

  - [ ] 12.4 Implement debugger_step_over tool
    - Accept session ID
    - Execute step over operation
    - Return new execution location
    - _Requirements: 2.3, 9.1_

  - [ ] 12.5 Implement debugger_inspect tool
    - Accept session ID and expression
    - Evaluate expression in current context
    - Return value with type information
    - _Requirements: 3.4, 9.1, 9.3_

  - [ ] 12.6 Implement debugger_get_stack tool
    - Accept session ID
    - Return current call stack
    - Include absolute file paths
    - _Requirements: 4.1, 9.1, 9.4_

  - [ ] 12.7 Implement debugger_detect_hang tool
    - Accept command, args, timeout, and sample interval
    - Run hang detection
    - Return hang status, location, and stack if hung
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 9.1_

  - [ ] 12.8 Write property test for response format consistency
    - **Property 20: Response format consistency**
    - **Validates: Requirements 9.1, 9.2**

- [ ] 13. Implement error handling and cleanup
  - [ ] 13.1 Implement crash detection
    - Listen for process exit events
    - Detect unexpected terminations
    - Clean up session resources on crash
    - Report crash with error details
    - _Requirements: 8.1_

  - [ ] 13.2 Write property test for crash detection and cleanup
    - **Property 17: Crash detection and cleanup**
    - **Validates: Requirements 8.1, 8.2**

  - [ ] 13.3 Implement session cleanup
    - Remove all breakpoints on session end
    - Disconnect inspector client
    - Kill process if still running
    - Release all resources
    - _Requirements: 8.2_

  - [ ] 13.4 Implement error response formatting
    - Create error response structure with code, message, and context
    - Handle CDP errors and convert to user-friendly messages
    - Ensure errors don't crash the MCP server
    - _Requirements: 9.2_

- [ ] 14. Set up MCP server
  - [ ] 14.1 Create MCP server instance
    - Initialize MCP server with name and version
    - Configure server capabilities
    - Set up stdio transport
    - _Requirements: 9.1_

  - [ ] 14.2 Register all MCP tools
    - Register all debugger tools with schemas
    - Connect tool handlers to implementation
    - Add input validation for each tool
    - _Requirements: 9.1_

  - [ ] 14.3 Implement server lifecycle management
    - Handle server startup and shutdown
    - Clean up all sessions on shutdown
    - Add logging for debugging
    - _Requirements: 8.2_

- [ ] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Create test fixtures and integration tests
  - [ ] 16.1 Create test fixture files
    - Create infinite-loop.js for hang detection testing
    - Create async-hang.js for async hang testing
    - Create normal-completion.js for successful execution
    - Create typescript-sample.ts for source map testing
    - _Requirements: 5.4, 7.1_

  - [ ] 16.2 Write integration test for hang detection
    - Test detecting infinite loops
    - Test detecting async hangs
    - Test normal completion without false positives
    - _Requirements: 5.1, 5.4_

  - [ ] 16.3 Write integration test for TypeScript debugging
    - Test setting breakpoints in TypeScript files
    - Test source map location mapping
    - Test variable inspection with TypeScript names
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ] 16.4 Write integration test for test framework integration
    - Test running Jest tests with debugger
    - Test capturing test output
    - Test reporting test failures
    - _Requirements: 6.1, 6.4, 6.5_

- [ ] 17. Create MCP configuration and documentation
  - [ ] 17.1 Create MCP configuration file
    - Add debugger server to .kiro/settings/mcp.json
    - Configure command and args for server startup
    - Test MCP connection from Kiro
    - _Requirements: 9.1_

  - [ ] 17.2 Write README documentation
    - Document installation instructions
    - Provide usage examples for each tool
    - Document common debugging scenarios
    - Add troubleshooting section
    - _Requirements: 9.2_

  - [ ] 17.3 Add code documentation
    - Add JSDoc comments to all public APIs
    - Document CDP protocol interactions
    - Document error codes and meanings
    - _Requirements: 9.2_

- [ ] 18. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
