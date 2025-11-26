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

- [x] 5. Implement breakpoint management
  - [x] 5.1 Create BreakpointManager class
    - Store breakpoint definitions with file, line, and condition
    - Generate unique breakpoint identifiers
    - Track breakpoint state (enabled/disabled)
    - Implement breakpoint CRUD operations
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 5.2 Write property test for breakpoint creation and retrieval
    - **Property 1: Breakpoint creation and retrieval consistency**
    - **Validates: Requirements 1.1, 1.3**

  - [x] 5.3 Write property test for breakpoint removal
    - **Property 3: Breakpoint removal completeness**
    - **Validates: Requirements 1.4**

  - [x] 5.4 Write property test for breakpoint toggle
    - **Property 4: Breakpoint toggle preserves identity**
    - **Validates: Requirements 1.5**

  - [x] 5.5 Implement CDP breakpoint operations
    - Map file paths to script IDs using Debugger.scriptParsed events
    - Set breakpoints using Debugger.setBreakpointByUrl
    - Remove breakpoints using Debugger.removeBreakpoint
    - Handle breakpoint resolution and verification
    - _Requirements: 1.1, 1.4_

  - [x] 5.6 Write property test for conditional breakpoints
    - **Property 2: Conditional breakpoint evaluation**
    - **Validates: Requirements 1.2**

- [x] 6. Implement execution control operations
  - [x] 6.1 Implement continue operation
    - Send Debugger.resume CDP command
    - Update session state to running
    - Handle Debugger.paused events
    - _Requirements: 2.2_

  - [x] 6.2 Implement step operations
    - Implement step over using Debugger.stepOver
    - Implement step into using Debugger.stepInto
    - Implement step out using Debugger.stepOut
    - Update session state after each step
    - _Requirements: 2.3, 2.4, 2.5_

  - [x] 6.3 Write property test for step operations
    - **Property 6: Step operations maintain execution flow**
    - **Validates: Requirements 2.3, 2.4, 2.5**

  - [x] 6.4 Implement pause operation
    - Send Debugger.pause CDP command
    - Update session state to paused
    - Capture current execution location
    - _Requirements: 2.6_

- [-] 7. Implement variable inspection
  - [x] 7.1 Implement expression evaluation
    - Get current call frame from paused state
    - Use Debugger.evaluateOnCallFrame to evaluate expressions
    - Handle evaluation errors gracefully
    - Serialize results with type information
    - _Requirements: 3.4, 9.3_

  - [x] 7.2 Write property test for expression evaluation
    - **Property 8: Expression evaluation correctness**
    - **Validates: Requirements 3.4**

  - [x] 7.3 Implement object inspection
    - Use Runtime.getProperties to get object properties
    - Handle nested objects and arrays
    - Limit inspection depth to prevent performance issues
    - Include type information in results
    - _Requirements: 3.3, 9.3_

  - [x] 7.4 Write property test for object inspection
    - **Property 7: Object inspection completeness**
    - **Validates: Requirements 3.3**

  - [x] 7.5 Write property test for complex object serialization
    - **Property 21: Complex object serialization with type information**
    - **Validates: Requirements 9.3**

  - [-] 7.6 Implement variable watching
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

## Enterprise-Grade Enhancements

- [ ] 19. Implement advanced breakpoint types
  - [ ] 19.1 Implement logpoints (non-breaking breakpoints)
    - Add logpoint type to breakpoint definitions
    - Implement log message template evaluation
    - Log to output without pausing execution
    - Support variable interpolation in log messages
    - _Requirements: Enhanced debugging capabilities_

  - [ ] 19.2 Implement exception breakpoints
    - Add exception breakpoint configuration
    - Break on caught exceptions (optional)
    - Break on uncaught exceptions
    - Filter by exception type/message
    - Capture exception details and stack trace
    - _Requirements: Enhanced debugging capabilities_

  - [ ] 19.3 Implement hit count breakpoints
    - Add hit count condition to breakpoints
    - Track breakpoint hit counts per session
    - Support operators (==, >, >=, <, <=, %)
    - Reset hit counts on session restart
    - _Requirements: Enhanced debugging capabilities_

  - [ ] 19.4 Implement function breakpoints
    - Break on function entry by name
    - Support regex patterns for function matching
    - Handle anonymous and arrow functions
    - _Requirements: Enhanced debugging capabilities_

  - [ ] 19.5 Add MCP tools for advanced breakpoints
    - Implement debugger_set_logpoint tool
    - Implement debugger_set_exception_breakpoint tool
    - Implement debugger_set_function_breakpoint tool
    - Update debugger_set_breakpoint to support hit counts
    - _Requirements: Enhanced debugging capabilities_

- [ ] 20. Implement security and compliance features
  - [ ] 20.1 Add authentication support
    - Implement token-based authentication for MCP connections
    - Support API key validation
    - Add session token management
    - _Requirements: Enterprise security_

  - [ ] 20.2 Implement rate limiting
    - Add rate limiting for debugging operations
    - Configure limits per operation type
    - Return appropriate error responses when limits exceeded
    - Track rate limit metrics
    - _Requirements: Enterprise security_

  - [ ] 20.3 Implement sensitive data masking
    - Detect common PII patterns (emails, SSNs, credit cards)
    - Mask sensitive values in variable inspection
    - Add configurable masking rules
    - Provide opt-out for trusted environments
    - _Requirements: Enterprise security_

  - [ ] 20.4 Add session timeout enforcement
    - Implement configurable session timeouts
    - Auto-cleanup expired sessions
    - Send timeout warnings before expiration
    - _Requirements: Enterprise security_

  - [ ] 20.5 Implement audit logging
    - Log all debugging operations with timestamps
    - Include user/session context in logs
    - Support structured logging formats (JSON)
    - Implement log rotation and retention policies
    - _Requirements: Enterprise security_

- [ ] 21. Implement observability and telemetry
  - [ ] 21.1 Add structured logging
    - Implement log levels (debug, info, warn, error)
    - Use structured logging format (JSON)
    - Add correlation IDs for request tracing
    - Include context (session ID, operation type)
    - _Requirements: Enterprise observability_

  - [ ] 21.2 Implement metrics collection
    - Track session duration and count
    - Track breakpoint hit counts
    - Track operation latencies
    - Track error rates by type
    - Expose metrics endpoint
    - _Requirements: Enterprise observability_

  - [ ] 21.3 Add health check endpoints
    - Implement /health endpoint
    - Implement /ready endpoint (readiness probe)
    - Implement /live endpoint (liveness probe)
    - Include dependency health checks
    - _Requirements: Production readiness_

  - [ ] 21.4 Implement session recording (optional)
    - Record debugging session events
    - Support session replay for debugging
    - Add privacy controls for recording
    - Implement storage management for recordings
    - _Requirements: Advanced observability_

- [ ] 22. Implement performance profiling features
  - [ ] 22.1 Add CPU profiling support
    - Use Profiler.start/stop CDP commands
    - Capture CPU profile data
    - Generate flame graphs or call trees
    - Provide profile analysis and bottleneck detection
    - _Requirements: Performance debugging_

  - [ ] 22.2 Add memory profiling support
    - Capture heap snapshots via HeapProfiler domain
    - Track memory allocation over time
    - Detect memory leaks via heap growth analysis
    - Provide memory usage reports
    - _Requirements: Performance debugging_

  - [ ] 22.3 Implement performance timeline
    - Record performance events during execution
    - Track function execution times
    - Identify slow operations
    - Generate performance reports
    - _Requirements: Performance debugging_

  - [ ] 22.4 Add MCP tools for profiling
    - Implement debugger_start_cpu_profile tool
    - Implement debugger_stop_cpu_profile tool
    - Implement debugger_take_heap_snapshot tool
    - Implement debugger_get_performance_metrics tool
    - _Requirements: Performance debugging_

- [ ] 23. Implement production readiness features
  - [ ] 23.1 Add graceful shutdown handling
    - Handle SIGTERM and SIGINT signals
    - Complete in-flight operations before shutdown
    - Clean up all active sessions
    - Close all connections gracefully
    - _Requirements: Production readiness_

  - [ ] 23.2 Implement circuit breakers
    - Add circuit breakers for CDP operations
    - Configure failure thresholds
    - Implement automatic recovery
    - Provide circuit breaker status monitoring
    - _Requirements: Production readiness_

  - [ ] 23.3 Add retry logic with exponential backoff
    - Implement retry for transient failures
    - Use exponential backoff strategy
    - Configure max retry attempts
    - Add jitter to prevent thundering herd
    - _Requirements: Production readiness_

  - [ ] 23.4 Implement resource limits and quotas
    - Limit max concurrent sessions per user
    - Limit max breakpoints per session
    - Limit max memory usage per session
    - Enforce timeout limits
    - _Requirements: Production readiness_

  - [ ] 23.5 Add Prometheus metrics export
    - Export metrics in Prometheus format
    - Include standard metrics (requests, latency, errors)
    - Include custom debugging metrics
    - Add metric labels for filtering
    - _Requirements: Production readiness_

- [ ] 24. Enhanced testing for enterprise features
  - [ ] 24.1 Implement load testing
    - Test with 100+ concurrent debug sessions
    - Measure throughput and latency under load
    - Identify performance bottlenecks
    - Test resource cleanup under load
    - _Requirements: Enterprise quality_

  - [ ] 24.2 Implement chaos testing
    - Test random process crashes
    - Test network disconnections
    - Test CDP protocol errors
    - Test resource exhaustion scenarios
    - Verify graceful degradation
    - _Requirements: Enterprise quality_

  - [ ] 24.3 Add compatibility testing
    - Test with Node.js 16, 18, 20, 22
    - Test with TypeScript 4.x and 5.x
    - Test with different test frameworks
    - Test on different operating systems
    - _Requirements: Enterprise quality_

  - [ ] 24.4 Implement security testing
    - Test authentication and authorization
    - Test rate limiting effectiveness
    - Test PII masking accuracy
    - Perform basic penetration testing
    - Test for common vulnerabilities
    - _Requirements: Enterprise quality_

  - [ ] 24.5 Add performance benchmarks
    - Benchmark breakpoint set/remove operations
    - Benchmark variable inspection latency
    - Benchmark session creation/cleanup
    - Track performance regression in CI
    - _Requirements: Enterprise quality_

- [ ] 25. Developer experience enhancements
  - [ ] 25.1 Add debugging configuration presets
    - Create presets for common scenarios (Node.js app, Jest tests, etc.)
    - Support custom preset definitions
    - Allow preset inheritance and composition
    - _Requirements: Enhanced DX_

  - [ ] 25.2 Implement workspace-aware debugging
    - Support monorepo debugging
    - Auto-detect workspace structure
    - Handle multiple package.json files
    - Support workspace-relative paths
    - _Requirements: Enhanced DX_

  - [ ] 25.3 Add multi-target debugging support
    - Debug multiple processes simultaneously
    - Coordinate breakpoints across targets
    - Aggregate logs from multiple targets
    - Support parent-child process debugging
    - _Requirements: Enhanced DX_

  - [ ] 25.4 Implement smart breakpoint suggestions
    - Suggest breakpoint locations based on code analysis
    - Recommend breakpoints for common debugging scenarios
    - Suggest conditional breakpoints based on context
    - _Requirements: Enhanced DX_

  - [ ] 25.5 Add variable formatting customization
    - Support custom formatters for types
    - Add pretty-printing options
    - Support truncation and depth limits
    - Allow user-defined display rules
    - _Requirements: Enhanced DX_

- [ ] 26. Final enterprise checkpoint
  - Ensure all enterprise features are tested
  - Verify security features are working correctly
  - Confirm observability and monitoring are operational
  - Validate production readiness
  - Ask the user if questions arise.

## Optional Long-Term Testing

- [ ] 27. Implement soak testing (optional - resource intensive)
  - [ ] 27.1 Set up long-running test environment
    - Configure dedicated test infrastructure
    - Set up monitoring and alerting
    - Prepare test scenarios
    - _Requirements: Long-term stability validation_

  - [ ] 27.2 Run continuous operation tests
    - Run continuous operation for 24+ hours
    - Monitor for memory leaks
    - Monitor for resource leaks
    - Verify stability under sustained load
    - _Requirements: Long-term stability validation_

  - [ ] 27.3 Analyze and report results
    - Collect and analyze metrics
    - Identify any degradation patterns
    - Document findings and recommendations
    - _Requirements: Long-term stability validation_
  - Ask the user if questions arise.

## Docker MCP Registry and VS Code/Copilot Integration

- [ ] 28. Prepare for Docker MCP Registry contribution
  - [ ] 28.1 Review Docker MCP Registry contribution guidelines
    - Read https://github.com/docker/mcp-registry/blob/main/CONTRIBUTING.md
    - Understand submission requirements and format
    - Review existing MCP server examples in the registry
    - _Requirements: Community contribution_

  - [ ] 28.2 Create MCP server package metadata
    - Create package.json with proper metadata (name, description, keywords)
    - Add repository, homepage, and bugs URLs
    - Include proper licensing information (MIT)
    - Add MCP server category tags (debugging, development-tools)
    - _Requirements: Registry submission_

  - [ ] 28.3 Write comprehensive README for registry
    - Document installation instructions
    - Provide usage examples with code snippets
    - List all available tools and their parameters
    - Include troubleshooting section
    - Add screenshots or GIFs demonstrating usage
    - Document system requirements (Node.js version, etc.)
    - _Requirements: Registry submission_

  - [ ] 28.4 Create MCP server configuration examples
    - Provide example mcp.json configuration for Kiro
    - Create configuration examples for other MCP clients
    - Document environment variables and options
    - Include common use case configurations
    - _Requirements: Registry submission_

  - [ ] 28.5 Prepare Docker MCP Registry submission
    - Create registry submission PR following guidelines
    - Include server metadata in proper format
    - Add server to appropriate category
    - Provide clear description and use cases
    - _Requirements: Registry submission_

- [ ] 29. VS Code and GitHub Copilot integration
  - [ ] 29.1 Research VS Code MCP integration
    - Investigate VS Code extension requirements for MCP
    - Review VS Code debugging API compatibility
    - Understand how to integrate with VS Code's debug adapter protocol
    - _Requirements: VS Code integration_

  - [ ] 29.2 Create VS Code extension (if needed)
    - Set up VS Code extension project structure
    - Implement MCP client for VS Code
    - Create debug configuration provider
    - Add commands for debugger operations
    - _Requirements: VS Code integration_

  - [ ] 29.3 Research GitHub Copilot integration
    - Investigate GitHub Copilot extension points
    - Understand how Copilot can use MCP servers
    - Review Copilot's debugging assistance capabilities
    - _Requirements: Copilot integration_

  - [ ] 29.4 Document VS Code/Copilot usage
    - Write guide for using debugger with VS Code
    - Document Copilot integration patterns
    - Provide example debugging workflows
    - Include configuration examples
    - _Requirements: VS Code/Copilot integration_

  - [ ] 29.5 Test VS Code/Copilot integration
    - Test debugger functionality in VS Code
    - Verify Copilot can use debugging tools
    - Test common debugging scenarios
    - Document any limitations or issues
    - _Requirements: VS Code/Copilot integration_
