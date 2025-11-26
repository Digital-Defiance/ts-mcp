import * as fc from 'fast-check';
import { SessionManager } from './session-manager';
import { DebugSession } from './debug-session';
import * as path from 'path';

describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  afterEach(async () => {
    // Clean up all sessions after each test
    await manager.cleanupAll();
  });

  it('should generate unique session IDs', async () => {
    const testScript = path.join(
      __dirname,
      '../../test-fixtures/simple-script.js',
    );

    const session1 = await manager.createSession({
      command: 'node',
      args: [testScript],
    });

    const session2 = await manager.createSession({
      command: 'node',
      args: [testScript],
    });

    expect(session1.id).not.toBe(session2.id);
    expect(manager.getSessionCount()).toBe(2);
  }, 20000);

  it('should retrieve sessions by ID', async () => {
    const testScript = path.join(
      __dirname,
      '../../test-fixtures/simple-script.js',
    );

    const session = await manager.createSession({
      command: 'node',
      args: [testScript],
    });

    const retrieved = manager.getSession(session.id);
    expect(retrieved).toBe(session);
    expect(retrieved?.id).toBe(session.id);
  }, 10000);

  it('should remove sessions', async () => {
    const testScript = path.join(
      __dirname,
      '../../test-fixtures/simple-script.js',
    );

    const session = await manager.createSession({
      command: 'node',
      args: [testScript],
    });

    expect(manager.hasSession(session.id)).toBe(true);

    const removed = await manager.removeSession(session.id);
    expect(removed).toBe(true);
    expect(manager.hasSession(session.id)).toBe(false);
  }, 10000);

  it('should cleanup all sessions', async () => {
    const testScript = path.join(
      __dirname,
      '../../test-fixtures/simple-script.js',
    );

    await manager.createSession({
      command: 'node',
      args: [testScript],
    });

    await manager.createSession({
      command: 'node',
      args: [testScript],
    });

    expect(manager.getSessionCount()).toBe(2);

    await manager.cleanupAll();
    expect(manager.getSessionCount()).toBe(0);
  }, 20000);

  // Feature: mcp-debugger-tool, Property 19: Debug session isolation
  // For any two concurrent Debug Sessions, operations performed on one session
  // should not affect the state, breakpoints, or execution of the other session.
  // Validates: Requirements 8.5
  it('should maintain session isolation between concurrent sessions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.record({
            file: fc.constant('test-file-1.js'),
            line: fc.integer({ min: 1, max: 100 }),
          }),
          fc.record({
            file: fc.constant('test-file-2.js'),
            line: fc.integer({ min: 1, max: 100 }),
          }),
        ),
        async ([breakpoint1, breakpoint2]) => {
          const testScript = path.join(
            __dirname,
            '../../test-fixtures/simple-script.js',
          );

          // Create two concurrent debug sessions
          const session1 = await manager.createSession({
            command: 'node',
            args: [testScript],
          });

          const session2 = await manager.createSession({
            command: 'node',
            args: [testScript],
          });

          // Verify sessions are distinct
          expect(session1.id).not.toBe(session2.id);

          // Add breakpoint to session1
          session1.addBreakpoint({
            id: 'bp1',
            file: breakpoint1.file,
            line: breakpoint1.line,
            enabled: true,
          });

          // Add different breakpoint to session2
          session2.addBreakpoint({
            id: 'bp2',
            file: breakpoint2.file,
            line: breakpoint2.line,
            enabled: true,
          });

          // Verify session1 only has its own breakpoint
          const session1Breakpoints = session1.getAllBreakpoints();
          expect(session1Breakpoints.length).toBe(1);
          expect(session1Breakpoints[0].id).toBe('bp1');
          expect(session1Breakpoints[0].file).toBe(breakpoint1.file);
          expect(session1Breakpoints[0].line).toBe(breakpoint1.line);

          // Verify session2 only has its own breakpoint
          const session2Breakpoints = session2.getAllBreakpoints();
          expect(session2Breakpoints.length).toBe(1);
          expect(session2Breakpoints[0].id).toBe('bp2');
          expect(session2Breakpoints[0].file).toBe(breakpoint2.file);
          expect(session2Breakpoints[0].line).toBe(breakpoint2.line);

          // Add watched variable to session1
          session1.addWatchedVariable({
            name: 'var1',
            expression: 'x + y',
          });

          // Add different watched variable to session2
          session2.addWatchedVariable({
            name: 'var2',
            expression: 'a + b',
          });

          // Verify session1 only has its own watched variable
          const session1Watches = session1.getAllWatchedVariables();
          expect(session1Watches.length).toBe(1);
          expect(session1Watches[0].name).toBe('var1');

          // Verify session2 only has its own watched variable
          const session2Watches = session2.getAllWatchedVariables();
          expect(session2Watches.length).toBe(1);
          expect(session2Watches[0].name).toBe('var2');

          // Verify both sessions have different processes
          const process1 = session1.getProcess();
          const process2 = session2.getProcess();
          expect(process1).not.toBeNull();
          expect(process2).not.toBeNull();
          expect(process1?.pid).not.toBe(process2?.pid);

          // Verify both sessions have different inspector clients
          const inspector1 = session1.getInspector();
          const inspector2 = session2.getInspector();
          expect(inspector1).not.toBeNull();
          expect(inspector2).not.toBeNull();
          expect(inspector1).not.toBe(inspector2);

          // Cleanup session1 should not affect session2
          await manager.removeSession(session1.id);
          expect(manager.hasSession(session1.id)).toBe(false);
          expect(manager.hasSession(session2.id)).toBe(true);

          // Session2 should still be active and have its data
          expect(session2.isActive()).toBe(true);
          expect(session2.getAllBreakpoints().length).toBe(1);
          expect(session2.getAllWatchedVariables().length).toBe(1);

          // Cleanup session2
          await manager.removeSession(session2.id);
        },
      ),
      { numRuns: 10 }, // Run 10 times for reasonable coverage with process spawning
    );
  }, 120000); // 2 minute timeout for multiple concurrent process spawns

  it('should handle session creation failure gracefully', async () => {
    // Try to create a session with an invalid command
    await expect(
      manager.createSession({
        command: 'nonexistent-command-xyz',
        args: [],
      }),
    ).rejects.toThrow();

    // Manager should not have any sessions after failed creation
    expect(manager.getSessionCount()).toBe(0);
  }, 10000);

  it('should prune terminated sessions', async () => {
    const testScript = path.join(
      __dirname,
      '../../test-fixtures/simple-script.js',
    );

    const session = await manager.createSession({
      command: 'node',
      args: [testScript],
    });

    expect(manager.getSessionCount()).toBe(1);

    // Cleanup the session (which terminates it)
    await session.cleanup();

    // Before pruning, session is still in the manager
    expect(manager.getSessionCount()).toBe(1);

    // After pruning, terminated session should be removed
    manager.pruneTerminatedSessions();
    expect(manager.getSessionCount()).toBe(0);
  }, 10000);
});
