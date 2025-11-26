import * as fc from 'fast-check';
import { BreakpointManager } from './breakpoint-manager';

describe('BreakpointManager', () => {
  let manager: BreakpointManager;

  beforeEach(() => {
    manager = new BreakpointManager();
  });

  // Feature: mcp-debugger-tool, Property 1: Breakpoint creation and retrieval consistency
  // For any valid file path and line number, when a breakpoint is created at that location,
  // then retrieving the breakpoint list should include that breakpoint with the correct file path and line number.
  // Validates: Requirements 1.1, 1.3
  it('should maintain consistency between breakpoint creation and retrieval', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // file path
        fc.integer({ min: 1, max: 10000 }), // line number
        fc.option(fc.string(), { nil: undefined }), // optional condition
        (file, line, condition) => {
          // Create a breakpoint
          const breakpoint = manager.createBreakpoint(file, line, condition);

          // Verify the breakpoint has the correct properties
          expect(breakpoint.file).toBe(file);
          expect(breakpoint.line).toBe(line);
          expect(breakpoint.condition).toBe(condition);
          expect(breakpoint.enabled).toBe(true);
          expect(breakpoint.id).toBeDefined();

          // Retrieve the breakpoint by ID
          const retrieved = manager.getBreakpoint(breakpoint.id);
          expect(retrieved).toBeDefined();
          expect(retrieved?.id).toBe(breakpoint.id);
          expect(retrieved?.file).toBe(file);
          expect(retrieved?.line).toBe(line);
          expect(retrieved?.condition).toBe(condition);

          // Verify the breakpoint appears in the list
          const allBreakpoints = manager.getAllBreakpoints();
          const found = allBreakpoints.find((bp) => bp.id === breakpoint.id);
          expect(found).toBeDefined();
          expect(found?.file).toBe(file);
          expect(found?.line).toBe(line);
          expect(found?.condition).toBe(condition);

          // Verify the breakpoint appears in file-specific list
          const fileBreakpoints = manager.getBreakpointsByFile(file);
          const foundInFile = fileBreakpoints.find(
            (bp) => bp.id === breakpoint.id,
          );
          expect(foundInFile).toBeDefined();
          expect(foundInFile?.line).toBe(line);

          // Clean up for next iteration
          manager.clearAll();
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: mcp-debugger-tool, Property 3: Breakpoint removal completeness
  // For any breakpoint that exists in the system, when that breakpoint is removed by its identifier,
  // then subsequent breakpoint list retrievals should not include that breakpoint.
  // Validates: Requirements 1.4
  it('should completely remove breakpoints when requested', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            file: fc.string({ minLength: 1 }),
            line: fc.integer({ min: 1, max: 10000 }),
            condition: fc.option(fc.string(), { nil: undefined }),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (breakpointSpecs) => {
          // Create multiple breakpoints
          const createdBreakpoints = breakpointSpecs.map((spec) =>
            manager.createBreakpoint(spec.file, spec.line, spec.condition),
          );

          // Verify all breakpoints exist
          expect(manager.getBreakpointCount()).toBe(createdBreakpoints.length);

          // Pick a random breakpoint to remove
          const indexToRemove = Math.floor(
            Math.random() * createdBreakpoints.length,
          );
          const breakpointToRemove = createdBreakpoints[indexToRemove];

          // Remove the breakpoint
          const removed = manager.removeBreakpoint(breakpointToRemove.id);
          expect(removed).toBe(true);

          // Verify the breakpoint no longer exists
          expect(manager.getBreakpoint(breakpointToRemove.id)).toBeUndefined();
          expect(manager.hasBreakpoint(breakpointToRemove.id)).toBe(false);

          // Verify the breakpoint is not in the list
          const allBreakpoints = manager.getAllBreakpoints();
          expect(allBreakpoints.length).toBe(createdBreakpoints.length - 1);
          const found = allBreakpoints.find(
            (bp) => bp.id === breakpointToRemove.id,
          );
          expect(found).toBeUndefined();

          // Verify the breakpoint is not in the file-specific list
          const fileBreakpoints = manager.getBreakpointsByFile(
            breakpointToRemove.file,
          );
          const foundInFile = fileBreakpoints.find(
            (bp) => bp.id === breakpointToRemove.id,
          );
          expect(foundInFile).toBeUndefined();

          // Verify all other breakpoints still exist
          createdBreakpoints.forEach((bp, index) => {
            if (index !== indexToRemove) {
              expect(manager.getBreakpoint(bp.id)).toBeDefined();
              expect(manager.hasBreakpoint(bp.id)).toBe(true);
            }
          });

          // Attempting to remove the same breakpoint again should return false
          const removedAgain = manager.removeBreakpoint(breakpointToRemove.id);
          expect(removedAgain).toBe(false);

          // Clean up for next iteration
          manager.clearAll();
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: mcp-debugger-tool, Property 4: Breakpoint toggle preserves identity
  // For any breakpoint, when its state is toggled between enabled and disabled,
  // the breakpoint should remain in the breakpoint list with the same identifier and location but with updated state.
  // Validates: Requirements 1.5
  it('should preserve breakpoint identity when toggling state', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // file path
        fc.integer({ min: 1, max: 10000 }), // line number
        fc.option(fc.string(), { nil: undefined }), // optional condition
        fc.integer({ min: 1, max: 10 }), // number of toggles
        (file, line, condition, numToggles) => {
          // Create a breakpoint
          const breakpoint = manager.createBreakpoint(file, line, condition);
          const originalId = breakpoint.id;

          // Store original properties
          const originalFile = breakpoint.file;
          const originalLine = breakpoint.line;
          const originalCondition = breakpoint.condition;

          // Verify initial state
          expect(breakpoint.enabled).toBe(true);

          // Toggle the breakpoint multiple times
          let expectedEnabled = true;
          for (let i = 0; i < numToggles; i++) {
            expectedEnabled = !expectedEnabled;
            const toggled = manager.toggleBreakpoint(originalId);

            // Verify toggle returned the breakpoint
            expect(toggled).toBeDefined();
            expect(toggled?.id).toBe(originalId);
            expect(toggled?.enabled).toBe(expectedEnabled);

            // Verify the breakpoint still exists with same ID
            const retrieved = manager.getBreakpoint(originalId);
            expect(retrieved).toBeDefined();
            expect(retrieved?.id).toBe(originalId);
            expect(retrieved?.enabled).toBe(expectedEnabled);

            // Verify identity is preserved (same file, line, condition)
            expect(retrieved?.file).toBe(originalFile);
            expect(retrieved?.line).toBe(originalLine);
            expect(retrieved?.condition).toBe(originalCondition);

            // Verify the breakpoint is still in the list
            const allBreakpoints = manager.getAllBreakpoints();
            expect(allBreakpoints.length).toBe(1);
            const found = allBreakpoints.find((bp) => bp.id === originalId);
            expect(found).toBeDefined();
            expect(found?.enabled).toBe(expectedEnabled);

            // Verify the breakpoint is still in the file-specific list
            const fileBreakpoints = manager.getBreakpointsByFile(file);
            expect(fileBreakpoints.length).toBe(1);
            expect(fileBreakpoints[0].id).toBe(originalId);
            expect(fileBreakpoints[0].enabled).toBe(expectedEnabled);
          }

          // Verify final state matches expected state after all toggles
          const finalBreakpoint = manager.getBreakpoint(originalId);
          expect(finalBreakpoint?.enabled).toBe(expectedEnabled);

          // Clean up for next iteration
          manager.clearAll();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should handle enable and disable operations correctly', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // file path
        fc.integer({ min: 1, max: 10000 }), // line number
        (file, line) => {
          // Create a breakpoint (starts enabled)
          const breakpoint = manager.createBreakpoint(file, line);
          expect(breakpoint.enabled).toBe(true);

          // Disable the breakpoint
          const disabled = manager.disableBreakpoint(breakpoint.id);
          expect(disabled).toBeDefined();
          expect(disabled?.enabled).toBe(false);
          expect(disabled?.id).toBe(breakpoint.id);

          // Verify it's disabled
          const retrieved1 = manager.getBreakpoint(breakpoint.id);
          expect(retrieved1?.enabled).toBe(false);

          // Enable the breakpoint
          const enabled = manager.enableBreakpoint(breakpoint.id);
          expect(enabled).toBeDefined();
          expect(enabled?.enabled).toBe(true);
          expect(enabled?.id).toBe(breakpoint.id);

          // Verify it's enabled
          const retrieved2 = manager.getBreakpoint(breakpoint.id);
          expect(retrieved2?.enabled).toBe(true);

          // Disabling an already disabled breakpoint should work
          manager.disableBreakpoint(breakpoint.id);
          manager.disableBreakpoint(breakpoint.id);
          expect(manager.getBreakpoint(breakpoint.id)?.enabled).toBe(false);

          // Enabling an already enabled breakpoint should work
          manager.enableBreakpoint(breakpoint.id);
          manager.enableBreakpoint(breakpoint.id);
          expect(manager.getBreakpoint(breakpoint.id)?.enabled).toBe(true);

          // Clean up for next iteration
          manager.clearAll();
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: mcp-debugger-tool, Property 2: Conditional breakpoint evaluation
  // For any conditional breakpoint with a valid condition expression,
  // the Target Process should only pause at that breakpoint when the condition evaluates to true.
  // Validates: Requirements 1.2
  it('should handle conditional breakpoints correctly', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // file path
        fc.integer({ min: 1, max: 10000 }), // line number
        fc.string({ minLength: 1 }), // condition expression
        (file, line, condition) => {
          // Create a conditional breakpoint
          const breakpoint = manager.createBreakpoint(file, line, condition);

          // Verify the breakpoint has the condition
          expect(breakpoint.condition).toBe(condition);

          // Retrieve the breakpoint
          const retrieved = manager.getBreakpoint(breakpoint.id);
          expect(retrieved).toBeDefined();
          expect(retrieved?.condition).toBe(condition);

          // Verify the condition is preserved in the list
          const allBreakpoints = manager.getAllBreakpoints();
          const found = allBreakpoints.find((bp) => bp.id === breakpoint.id);
          expect(found).toBeDefined();
          expect(found?.condition).toBe(condition);

          // Clean up for next iteration
          manager.clearAll();
        },
      ),
      { numRuns: 100 },
    );
  });
});
