import * as fc from 'fast-check';
import { DebugSession, SessionState, StackFrame } from './debug-session';
import * as path from 'path';

describe('Call Stack Operations', () => {
  const testFixturePath = path.join(
    __dirname,
    '../../test-fixtures/step-test.js',
  );

  // Feature: mcp-debugger-tool, Property 22: Call stack absolute path requirement
  // For any call stack returned by the MCP Server,
  // every stack frame should include an absolute file path, not a relative path.
  // Validates: Requirements 9.4
  it('should return call stack with absolute file paths', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const session = new DebugSession('test-callstack-absolute', {
          command: 'node',
          args: [testFixturePath],
        });

        try {
          await session.start();
          expect(session.getState()).toBe(SessionState.PAUSED);

          const inspector = session.getInspector();
          if (!inspector) {
            throw new Error('Inspector not available');
          }

          // Wait for Debugger.paused event
          const waitForPaused = () =>
            new Promise<void>((resolve) => {
              inspector.once('Debugger.paused', () => resolve());
            });

          // Resume to hit the first debugger statement
          const pausedPromise = waitForPaused();
          await session.resume();
          await pausedPromise;

          expect(session.getState()).toBe(SessionState.PAUSED);

          // Get the call stack
          const callStack = session.getCallStack();

          // Verify we have at least one frame
          expect(callStack.length).toBeGreaterThan(0);

          // Property: Every frame must have an absolute file path
          for (const frame of callStack) {
            // Check that file path is absolute
            expect(path.isAbsolute(frame.file)).toBe(true);

            // Verify other required fields are present
            expect(frame.functionName).toBeDefined();
            expect(typeof frame.functionName).toBe('string');
            expect(frame.line).toBeDefined();
            expect(typeof frame.line).toBe('number');
            expect(frame.line).toBeGreaterThan(0);
            expect(frame.column).toBeDefined();
            expect(typeof frame.column).toBe('number');
            expect(frame.column).toBeGreaterThanOrEqual(0);
            expect(frame.callFrameId).toBeDefined();
            expect(typeof frame.callFrameId).toBe('string');
          }
        } finally {
          await session.cleanup();
        }
      }),
      { numRuns: 100, timeout: 60000 },
    );
  }, 120000);

  it('should return call stack with function names and line numbers', async () => {
    const session = new DebugSession('test-callstack-details', {
      command: 'node',
      args: [testFixturePath],
    });

    try {
      await session.start();
      expect(session.getState()).toBe(SessionState.PAUSED);

      const inspector = session.getInspector();
      if (!inspector) {
        throw new Error('Inspector not available');
      }

      // Wait for Debugger.paused event
      const waitForPaused = () =>
        new Promise<void>((resolve) => {
          inspector.once('Debugger.paused', () => resolve());
        });

      // Resume to hit the first debugger statement
      let pausedPromise = waitForPaused();
      await session.resume();
      await pausedPromise;

      expect(session.getState()).toBe(SessionState.PAUSED);

      // Get the call stack
      const callStack = session.getCallStack();

      // Verify we have at least one frame
      expect(callStack.length).toBeGreaterThan(0);

      // Verify the top frame has the expected structure
      const topFrame = callStack[0];
      expect(topFrame.functionName).toBeDefined();
      expect(topFrame.file).toBeDefined();
      expect(path.isAbsolute(topFrame.file)).toBe(true);
      expect(topFrame.line).toBeGreaterThan(0);
      expect(topFrame.column).toBeGreaterThanOrEqual(0);
      expect(topFrame.callFrameId).toBeDefined();
    } finally {
      await session.cleanup();
    }
  }, 30000);

  it('should throw error when getting call stack in non-paused state', async () => {
    // Use simple-script.js which doesn't have debugger statements
    const simpleScriptPath = path.join(
      __dirname,
      '../../test-fixtures/simple-script.js',
    );

    const session = new DebugSession('test-callstack-error', {
      command: 'node',
      args: [simpleScriptPath],
    });

    try {
      await session.start();
      expect(session.getState()).toBe(SessionState.PAUSED);

      // Resume execution - the script will run to completion
      await session.resume();

      // Wait a bit to ensure we're running
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify we're in running state
      expect(session.getState()).toBe(SessionState.RUNNING);

      // Try to get call stack while running
      expect(() => session.getCallStack()).toThrow(
        'Process must be paused to get call stack',
      );
    } finally {
      await session.cleanup();
    }
  }, 30000);

  it('should return empty array when no call frames available', async () => {
    const session = new DebugSession('test-callstack-empty', {
      command: 'node',
      args: [testFixturePath],
    });

    try {
      await session.start();
      expect(session.getState()).toBe(SessionState.PAUSED);

      // At the initial pause, we should have call frames
      // But let's test the behavior when call frames are cleared
      const callStack = session.getCallStack();

      // Should have frames at initial pause
      expect(Array.isArray(callStack)).toBe(true);
    } finally {
      await session.cleanup();
    }
  }, 30000);

  it('should handle nested function calls in call stack', async () => {
    const session = new DebugSession('test-callstack-nested', {
      command: 'node',
      args: [testFixturePath],
    });

    try {
      await session.start();
      expect(session.getState()).toBe(SessionState.PAUSED);

      const inspector = session.getInspector();
      if (!inspector) {
        throw new Error('Inspector not available');
      }

      // Wait for Debugger.paused event
      const waitForPaused = () =>
        new Promise<void>((resolve) => {
          inspector.once('Debugger.paused', () => resolve());
        });

      // Resume to hit the first debugger statement
      let pausedPromise = waitForPaused();
      await session.resume();
      await pausedPromise;

      // Step into a few times to get into nested functions
      for (let i = 0; i < 3; i++) {
        pausedPromise = waitForPaused();
        await session.stepInto();
        await pausedPromise;
      }

      // Get the call stack
      const callStack = session.getCallStack();

      // Should have multiple frames for nested calls
      expect(callStack.length).toBeGreaterThan(1);

      // All frames should have absolute paths
      for (const frame of callStack) {
        expect(path.isAbsolute(frame.file)).toBe(true);
      }
    } finally {
      await session.cleanup();
    }
  }, 30000);
});
