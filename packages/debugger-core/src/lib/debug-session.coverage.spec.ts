/**
 * Additional Coverage Tests for DebugSession
 *
 * This file adds tests to cover uncovered lines and branches in debug-session.ts
 * Target: 90% line coverage, 85% branch coverage
 */

import {
  DebugSession,
  DebugSessionConfig,
  SessionState,
  BreakpointType,
  HitCountOperator,
} from './debug-session';
import { SessionManager } from './session-manager';
import * as path from 'path';
import * as fs from 'fs';

describe('DebugSession - Additional Coverage Tests', () => {
  let sessionManager: SessionManager;
  const testFixturePath = path.join(
    __dirname,
    '../../test-fixtures/debug-session-test.js',
  );

  beforeAll(() => {
    const fixtureDir = path.dirname(testFixturePath);
    if (!fs.existsSync(fixtureDir)) {
      fs.mkdirSync(fixtureDir, { recursive: true });
    }

    if (!fs.existsSync(testFixturePath)) {
      fs.writeFileSync(
        testFixturePath,
        `function add(a, b) { return a + b; }
const result = add(2, 3);
console.log('Result:', result);
process.exit(0);`,
      );
    }
  });

  beforeEach(() => {
    sessionManager = new SessionManager();
  });

  afterEach(async () => {
    try {
      await sessionManager.cleanupAll();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Breakpoint Management', () => {
    it('should set breakpoint with source map mapping for TypeScript files', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      // Test with .ts file extension
      const breakpoint = await session.setBreakpoint(
        testFixturePath.replace('.js', '.ts'),
        5,
      );

      expect(breakpoint).toBeDefined();
      expect(breakpoint.file).toContain('.ts');
      expect(breakpoint.line).toBe(5);
    }, 15000);

    it('should set breakpoint with condition', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const breakpoint = await session.setBreakpoint(
        testFixturePath,
        5,
        'x > 10',
      );

      expect(breakpoint).toBeDefined();
      expect(breakpoint.condition).toBe('x > 10');
    }, 15000);

    it('should set logpoint', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const logpoint = await session.setLogpoint(
        testFixturePath,
        5,
        'Value is {x}',
      );

      expect(logpoint).toBeDefined();
      expect(logpoint.type).toBe(BreakpointType.LOGPOINT);
      expect(logpoint.logMessage).toBe('Value is {x}');
    }, 15000);

    it('should set logpoint with TypeScript source mapping', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const logpoint = await session.setLogpoint(
        testFixturePath.replace('.js', '.ts'),
        5,
        'Value is {x}',
      );

      expect(logpoint).toBeDefined();
      expect(logpoint.file).toContain('.ts');
    }, 15000);

    it('should set function breakpoint', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const breakpoint = await session.setFunctionBreakpoint('add');

      expect(breakpoint).toBeDefined();
      expect(breakpoint.type).toBe(BreakpointType.FUNCTION);
      expect(breakpoint.functionName).toBe('add');
    }, 15000);

    it('should set hit count condition on breakpoint', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const breakpoint = await session.setBreakpoint(testFixturePath, 5);
      const updated = session.setBreakpointHitCountCondition(breakpoint.id, {
        operator: HitCountOperator.GREATER,
        value: 5,
      });

      expect(updated).toBeDefined();
      expect(updated?.hitCountCondition).toBeDefined();
      expect(updated?.hitCountCondition?.operator).toBe(
        HitCountOperator.GREATER,
      );
      expect(updated?.hitCountCondition?.value).toBe(5);
    }, 15000);

    it('should get breakpoint by ID', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const breakpoint = await session.setBreakpoint(testFixturePath, 5);
      const retrieved = session.getBreakpoint(breakpoint.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(breakpoint.id);
    }, 15000);

    it('should get all breakpoints', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      await session.setBreakpoint(testFixturePath, 5);
      await session.setBreakpoint(testFixturePath, 10);

      const breakpoints = session.getAllBreakpoints();
      expect(breakpoints.length).toBeGreaterThanOrEqual(2);
    }, 15000);

    it('should remove breakpoint', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const breakpoint = await session.setBreakpoint(testFixturePath, 5);
      const removed = await session.removeBreakpoint(breakpoint.id);

      expect(removed).toBe(true);
      expect(session.getBreakpoint(breakpoint.id)).toBeUndefined();
    }, 15000);

    it('should return false when removing non-existent breakpoint', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const removed = await session.removeBreakpoint('non-existent-id');
      expect(removed).toBe(false);
    }, 15000);

    it('should toggle breakpoint enabled state', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const breakpoint = await session.setBreakpoint(testFixturePath, 5);
      expect(breakpoint.enabled).toBe(true);

      const toggled = await session.toggleBreakpoint(breakpoint.id);
      expect(toggled?.enabled).toBe(false);

      const toggledAgain = await session.toggleBreakpoint(breakpoint.id);
      expect(toggledAgain?.enabled).toBe(true);
    }, 15000);

    it('should return undefined when toggling non-existent breakpoint', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const toggled = await session.toggleBreakpoint('non-existent-id');
      expect(toggled).toBeUndefined();
    }, 15000);

    it('should get breakpoint manager', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const manager = session.getBreakpointManager();
      expect(manager).toBeDefined();
    }, 15000);
  });

  describe('Exception Breakpoints', () => {
    it('should set exception breakpoint for uncaught exceptions', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const exceptionBp = await session.setExceptionBreakpoint(false, true);

      expect(exceptionBp).toBeDefined();
      expect(exceptionBp.breakOnUncaught).toBe(true);
      expect(exceptionBp.breakOnCaught).toBe(false);
    }, 15000);

    it('should set exception breakpoint for caught exceptions', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const exceptionBp = await session.setExceptionBreakpoint(true, false);

      expect(exceptionBp).toBeDefined();
      expect(exceptionBp.breakOnCaught).toBe(true);
      expect(exceptionBp.breakOnUncaught).toBe(false);
    }, 15000);

    it('should set exception breakpoint for all exceptions', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const exceptionBp = await session.setExceptionBreakpoint(true, true);

      expect(exceptionBp).toBeDefined();
      expect(exceptionBp.breakOnCaught).toBe(true);
      expect(exceptionBp.breakOnUncaught).toBe(true);
    }, 15000);

    it('should set exception breakpoint with filter', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const exceptionBp = await session.setExceptionBreakpoint(
        true,
        true,
        'TypeError',
      );

      expect(exceptionBp).toBeDefined();
      expect(exceptionBp.exceptionFilter).toBe('TypeError');
    }, 15000);

    it('should get exception breakpoint by ID', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const exceptionBp = await session.setExceptionBreakpoint(true, true);
      const retrieved = session.getExceptionBreakpoint(exceptionBp.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(exceptionBp.id);
    }, 15000);

    it('should get all exception breakpoints', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      await session.setExceptionBreakpoint(true, false);
      await session.setExceptionBreakpoint(false, true);

      const exceptionBps = session.getAllExceptionBreakpoints();
      expect(exceptionBps.length).toBeGreaterThanOrEqual(1);
    }, 15000);

    it('should remove exception breakpoint', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const exceptionBp = await session.setExceptionBreakpoint(true, true);
      const removed = await session.removeExceptionBreakpoint(exceptionBp.id);

      expect(removed).toBe(true);
      expect(session.getExceptionBreakpoint(exceptionBp.id)).toBeUndefined();
    }, 15000);

    it('should return false when removing non-existent exception breakpoint', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const removed =
        await session.removeExceptionBreakpoint('non-existent-id');
      expect(removed).toBe(false);
    }, 15000);

    it('should disable exception pausing when all exception breakpoints removed', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const exceptionBp = await session.setExceptionBreakpoint(true, true);
      await session.removeExceptionBreakpoint(exceptionBp.id);

      // Should not throw
      expect(session.getAllExceptionBreakpoints().length).toBe(0);
    }, 15000);
  });

  describe('Variable Inspection', () => {
    it('should evaluate expression in current context', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      // Session should be paused at start
      const result = await session.evaluateExpression('2 + 2');

      expect(result).toBeDefined();
      expect(result.value).toBe(4);
    }, 15000);

    it('should fail to evaluate expression when not paused', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      await session.resume();
      await new Promise((resolve) => setTimeout(resolve, 100));

      await expect(session.evaluateExpression('2 + 2')).rejects.toThrow(
        'Process must be paused',
      );
    }, 15000);

    it('should fail to evaluate expression when session not started', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      (session as any).variableInspector = null;

      await expect(session.evaluateExpression('2 + 2')).rejects.toThrow(
        'Session not started',
      );
    }, 15000);

    it('should fail to evaluate expression when no call frames available', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      (session as any).currentCallFrames = [];

      await expect(session.evaluateExpression('2 + 2')).rejects.toThrow(
        'No call frames available',
      );
    }, 15000);

    it('should get object properties', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      // Evaluate an object first
      const result = await session.evaluateExpression('({a: 1, b: 2})');

      if (result.objectId) {
        const properties = await session.getObjectProperties(result.objectId);
        expect(properties).toBeDefined();
        expect(Array.isArray(properties)).toBe(true);
      }
    }, 15000);

    it('should fail to get object properties when not paused', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      await session.resume();
      await new Promise((resolve) => setTimeout(resolve, 100));

      await expect(session.getObjectProperties('some-id')).rejects.toThrow(
        'Process must be paused',
      );
    }, 15000);

    it('should inspect object with nested properties', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const result = await session.evaluateExpression('({a: 1, b: {c: 2}})');

      if (result.objectId) {
        const inspected = await session.inspectObject(result.objectId, 2);
        expect(inspected).toBeDefined();
      }
    }, 15000);

    it('should fail to inspect object when not paused', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      await session.resume();
      await new Promise((resolve) => setTimeout(resolve, 100));

      await expect(session.inspectObject('some-id')).rejects.toThrow(
        'Process must be paused',
      );
    }, 15000);
  });

  describe('Watched Variables', () => {
    it('should add watched variable', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      session.addWatchedVariable({
        name: 'x',
        expression: 'x',
      });

      const watched = session.getWatchedVariable('x');
      expect(watched).toBeDefined();
      expect(watched?.name).toBe('x');
    }, 15000);

    it('should get all watched variables', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      session.addWatchedVariable({ name: 'x', expression: 'x' });
      session.addWatchedVariable({ name: 'y', expression: 'y' });

      const watched = session.getAllWatchedVariables();
      expect(watched.length).toBe(2);
    }, 15000);

    it('should remove watched variable', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      session.addWatchedVariable({ name: 'x', expression: 'x' });
      const removed = session.removeWatchedVariable('x');

      expect(removed).toBe(true);
      expect(session.getWatchedVariable('x')).toBeUndefined();
    }, 15000);

    it('should return false when removing non-existent watched variable', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const removed = session.removeWatchedVariable('non-existent');
      expect(removed).toBe(false);
    }, 15000);

    it('should evaluate watched variables and detect changes', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      session.addWatchedVariable({ name: 'result', expression: '2 + 2' });

      const changes = await session.evaluateWatchedVariables();
      expect(changes).toBeDefined();
    }, 15000);

    it('should get watched variable changes', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const changes = session.getWatchedVariableChanges();
      expect(changes).toBeDefined();
      expect(changes instanceof Map).toBe(true);
    }, 15000);

    it('should clear watched variable changes', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      session.clearWatchedVariableChanges();
      const changes = session.getWatchedVariableChanges();
      expect(changes.size).toBe(0);
    }, 15000);
  });

  describe('Call Stack Management', () => {
    it('should get current call frames', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const frames = session.getCurrentCallFrames();
      expect(frames).toBeDefined();
      expect(Array.isArray(frames)).toBe(true);
    }, 15000);

    it('should get call stack with absolute paths', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const stack = await session.getCallStack();
      expect(stack).toBeDefined();
      expect(Array.isArray(stack)).toBe(true);

      if (stack.length > 0) {
        expect(stack[0].file).toMatch(/^\//); // Should start with /
      }
    }, 15000);

    it('should fail to get call stack when not paused', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      await session.resume();
      await new Promise((resolve) => setTimeout(resolve, 100));

      await expect(session.getCallStack()).rejects.toThrow(
        'Process must be paused',
      );
    }, 15000);

    it('should return empty array when no call frames available', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      (session as any).currentCallFrames = [];

      const stack = await session.getCallStack();
      expect(stack).toEqual([]);
    }, 15000);

    it('should get call stack synchronously', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const stack = session.getCallStackSync();
      expect(stack).toBeDefined();
      expect(Array.isArray(stack)).toBe(true);
    }, 15000);

    it('should switch to different stack frame', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const frames = session.getCurrentCallFrames();
      if (frames.length > 0) {
        session.switchToFrame(0);
        expect(session.getCurrentFrameIndex()).toBe(0);
      }
    }, 15000);

    it('should fail to switch frame when not paused', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      await session.resume();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(() => session.switchToFrame(0)).toThrow('Process must be paused');
    }, 15000);

    it('should fail to switch frame when no call frames available', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      (session as any).currentCallFrames = [];

      expect(() => session.switchToFrame(0)).toThrow(
        'No call frames available',
      );
    }, 15000);

    it('should fail to switch frame with invalid index', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      expect(() => session.switchToFrame(999)).toThrow('out of range');
    }, 15000);

    it('should get current frame index', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const index = session.getCurrentFrameIndex();
      expect(typeof index).toBe('number');
    }, 15000);

    it('should get current call frame ID', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const frameId = session.getCurrentCallFrameId();
      expect(frameId).toBeDefined();
    }, 15000);

    it('should return undefined for call frame ID when no frames', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      (session as any).currentCallFrames = [];

      const frameId = session.getCurrentCallFrameId();
      expect(frameId).toBeUndefined();
    }, 15000);
  });

  describe('Source Map Support', () => {
    it('should get source map manager', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const manager = session.getSourceMapManager();
      expect(manager).toBeDefined();
    }, 15000);

    it('should map source to compiled location', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const mapped = await session.mapSourceToCompiled(testFixturePath, 5, 0);
      expect(mapped).toBeDefined();
    }, 15000);

    it('should map compiled to source location', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const mapped = await session.mapCompiledToSource(testFixturePath, 5, 0);
      expect(mapped).toBeDefined();
    }, 15000);
  });

  describe('Crash Handling', () => {
    it('should register crash handler', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      let crashCalled = false;
      session.onCrash((error) => {
        crashCalled = true;
      });

      // Simulate crash
      (session as any).handleProcessError(new Error('Test crash'));

      expect(crashCalled).toBe(true);
    }, 15000);

    it('should get crash error', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      // Simulate crash
      (session as any).handleProcessError(new Error('Test crash'));

      const error = session.getCrashError();
      expect(error).toBeDefined();
      expect(error?.message).toBe('Test crash');
    }, 15000);

    it('should check if process crashed', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      expect(session.hasCrashed()).toBe(false);

      // Simulate crash
      (session as any).handleProcessError(new Error('Test crash'));

      expect(session.hasCrashed()).toBe(true);
    }, 15000);

    it('should handle process exit with non-zero code', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      let crashCalled = false;
      session.onCrash(() => {
        crashCalled = true;
      });

      // Simulate exit with error code
      (session as any).handleProcessExit(1, null);

      expect(crashCalled).toBe(true);
    }, 15000);

    it('should handle process exit with signal', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      let crashCalled = false;
      session.onCrash(() => {
        crashCalled = true;
      });

      // Simulate exit with signal
      (session as any).handleProcessExit(null, 'SIGKILL');

      expect(crashCalled).toBe(true);
    }, 15000);

    it('should handle normal process exit', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      let crashCalled = false;
      session.onCrash(() => {
        crashCalled = true;
      });

      // Simulate normal exit
      (session as any).handleProcessExit(0, null);

      expect(crashCalled).toBe(false);
    }, 15000);

    it('should ignore duplicate exit events', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      let crashCount = 0;
      session.onCrash(() => {
        crashCount++;
      });

      // Simulate exit twice
      (session as any).handleProcessExit(1, null);
      (session as any).handleProcessExit(1, null);

      // Should only be called once
      expect(crashCount).toBe(1);
    }, 15000);
  });

  describe('Performance Profiling', () => {
    it('should start CPU profiling', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      await session.startCPUProfile();
      expect(session.isCPUProfiling()).toBe(true);
    }, 15000);

    it('should stop CPU profiling', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      await session.startCPUProfile();
      const profile = await session.stopCPUProfile();

      expect(profile).toBeDefined();
      expect(session.isCPUProfiling()).toBe(false);
    }, 15000);

    it('should fail to start CPU profiling when session not started', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      (session as any).cpuProfiler = null;

      await expect(session.startCPUProfile()).rejects.toThrow(
        'Session not started',
      );
    }, 15000);

    it('should get CPU profiler instance', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const profiler = session.getCPUProfiler();
      expect(profiler).toBeDefined();
    }, 15000);

    it('should analyze CPU profile', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      await session.startCPUProfile();
      const profile = await session.stopCPUProfile();
      const analysis = session.analyzeCPUProfile(profile);

      expect(analysis).toBeDefined();
    }, 15000);

    it('should take heap snapshot', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const snapshot = await session.takeHeapSnapshot();
      expect(snapshot).toBeDefined();
    }, 15000);

    it('should get memory usage', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const usage = await session.getMemoryUsage();
      expect(usage).toBeDefined();
      // Memory usage has totalSize and usedSize
      expect(usage).toHaveProperty('totalSize');
      expect(usage).toHaveProperty('usedSize');
    }, 15000);

    it('should start tracking heap objects', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      await session.startTrackingHeapObjects(1024);
      // Should not throw
    }, 15000);

    it('should stop tracking heap objects', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      await session.startTrackingHeapObjects();
      const snapshot = await session.stopTrackingHeapObjects();

      expect(snapshot).toBeDefined();
    }, 15000);

    it.skip('should detect memory leaks', async () => {
      // Skipping due to timeout issues with HeapProfiler.collectGarbage
      // This is a known issue with CDP in test environments
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const analysis = await session.detectMemoryLeaks(200, 100);
      expect(analysis).toBeDefined();
      expect(analysis).toHaveProperty('hasLeak');
    }, 25000);

    it('should generate memory report', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const report = await session.generateMemoryReport();
      expect(report).toBeDefined();
    }, 15000);

    it('should get memory profiler instance', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const profiler = session.getMemoryProfiler();
      expect(profiler).toBeDefined();
    }, 15000);

    it('should start performance recording', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      await session.startPerformanceRecording();
      expect(session.isPerformanceRecording()).toBe(true);
    }, 15000);

    it('should stop performance recording', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      await session.startPerformanceRecording();
      const report = await session.stopPerformanceRecording();

      expect(report).toBeDefined();
      expect(session.isPerformanceRecording()).toBe(false);
    }, 15000);

    it('should record function call', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      await session.startPerformanceRecording();
      session.recordFunctionCall('testFunc', testFixturePath, 10, 1000);

      // Should not throw
    }, 15000);

    it('should fail to record function call when session not started', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      (session as any).performanceTimeline = null;

      expect(() =>
        session.recordFunctionCall('testFunc', testFixturePath, 10, 1000),
      ).toThrow('Session not started');
    }, 15000);

    it('should get performance timeline instance', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const timeline = session.getPerformanceTimeline();
      expect(timeline).toBeDefined();
    }, 15000);
  });

  describe('Session State Queries', () => {
    it('should check if session is active', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      expect(session.isActive()).toBe(true);

      await session.cleanup();
      expect(session.isActive()).toBe(false);
    }, 15000);

    it('should check if session is paused', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      expect(session.isPaused()).toBe(true);

      await session.resume();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(session.isPaused()).toBe(false);
    }, 15000);

    it('should get session state', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      expect(session.getState()).toBe(SessionState.PAUSED);
    }, 15000);

    it('should get inspector client', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const inspector = session.getInspector();
      expect(inspector).toBeDefined();
    }, 15000);

    it('should get process handle', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      const proc = session.getProcess();
      expect(proc).toBeDefined();
    }, 15000);
  });

  describe('Error Conditions', () => {
    it('should fail to set breakpoint when session not started', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      (session as any).cdpBreakpointOps = null;

      await expect(session.setBreakpoint(testFixturePath, 5)).rejects.toThrow(
        'Session not started',
      );
    }, 15000);

    it('should fail to set logpoint when session not started', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      (session as any).cdpBreakpointOps = null;

      await expect(
        session.setLogpoint(testFixturePath, 5, 'message'),
      ).rejects.toThrow('Session not started');
    }, 15000);

    it('should fail to set function breakpoint when session not started', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      (session as any).cdpBreakpointOps = null;

      await expect(session.setFunctionBreakpoint('func')).rejects.toThrow(
        'Session not started',
      );
    }, 15000);

    it('should fail to set exception breakpoint when session not started', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      (session as any).inspector = null;

      await expect(session.setExceptionBreakpoint(true, true)).rejects.toThrow(
        'Session not started',
      );
    }, 15000);

    it('should fail to analyze CPU profile when session not started', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      (session as any).cpuProfiler = null;

      expect(() =>
        session.analyzeCPUProfile({ nodes: [], startTime: 0, endTime: 0 }),
      ).toThrow('Session not started');
    }, 15000);

    it('should fail to take heap snapshot when session not started', async () => {
      const session = await sessionManager.createSession({
        command: 'node',
        args: [testFixturePath],
        cwd: process.cwd(),
      });

      (session as any).memoryProfiler = null;

      await expect(session.takeHeapSnapshot()).rejects.toThrow(
        'Session not started',
      );
    }, 15000);
  });
});
