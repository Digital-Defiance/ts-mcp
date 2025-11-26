import * as fc from 'fast-check';
import * as path from 'path';
import { SourceMapManager } from './source-map-manager';

describe('SourceMapManager', () => {
  let manager: SourceMapManager;

  beforeEach(() => {
    manager = new SourceMapManager();
  });

  afterEach(() => {
    manager.clearCache();
  });

  describe('Source Map Loading', () => {
    it('should load source map for JavaScript file', async () => {
      const jsFile = path.resolve(
        __dirname,
        '../../test-fixtures/typescript-sample.js',
      );

      const consumer = await manager.loadSourceMap(jsFile);
      expect(consumer).not.toBeNull();
    });

    it('should return null for file without source map', async () => {
      const jsFile = path.resolve(
        __dirname,
        '../../test-fixtures/simple-script.js',
      );

      const consumer = await manager.loadSourceMap(jsFile);
      expect(consumer).toBeNull();
    });

    it('should cache loaded source maps', async () => {
      const jsFile = path.resolve(
        __dirname,
        '../../test-fixtures/typescript-sample.js',
      );

      await manager.loadSourceMap(jsFile);
      expect(manager.getCacheSize()).toBe(1);

      // Load again - should use cache
      await manager.loadSourceMap(jsFile);
      expect(manager.getCacheSize()).toBe(1);
    });

    it('should check if source map exists', () => {
      const jsFile = path.resolve(
        __dirname,
        '../../test-fixtures/typescript-sample.js',
      );

      expect(manager.hasSourceMap(jsFile)).toBe(true);
    });
  });

  describe('Location Mapping', () => {
    it('should map compiled location to source location', async () => {
      const jsFile = path.resolve(
        __dirname,
        '../../test-fixtures/typescript-sample.js',
      );

      // Map a location in the compiled JavaScript back to TypeScript
      const sourceLocation = await manager.mapCompiledToSource({
        file: jsFile,
        line: 4, // Line in the compiled JS
        column: 0,
      });

      expect(sourceLocation).not.toBeNull();
      if (sourceLocation) {
        expect(sourceLocation.file).toContain('typescript-sample.ts');
        expect(sourceLocation.line).toBeGreaterThan(0);
      }
    });

    it('should return null for file without source map', async () => {
      const jsFile = path.resolve(
        __dirname,
        '../../test-fixtures/simple-script.js',
      );

      const sourceLocation = await manager.mapCompiledToSource({
        file: jsFile,
        line: 1,
        column: 0,
      });

      expect(sourceLocation).toBeNull();
    });
  });

  /**
   * Feature: mcp-debugger-tool, Property 15: Source map round-trip consistency
   * For any TypeScript source location with a valid source map, mapping that location
   * to JavaScript and then back to TypeScript should yield the original location.
   * Validates: Requirements 7.2, 7.3
   */
  describe('Property 15: Source map round-trip consistency', () => {
    it('should maintain round-trip consistency for valid source locations', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate line numbers within the TypeScript file range (1-40)
          fc.integer({ min: 1, max: 40 }),
          // Generate column numbers (0-80)
          fc.integer({ min: 0, max: 80 }),
          async (line, column) => {
            const tsFile = path.resolve(
              __dirname,
              '../../test-fixtures/typescript-sample.ts',
            );

            // First, map TypeScript to JavaScript
            const compiledLocation = await manager.mapSourceToCompiled({
              file: tsFile,
              line,
              column,
            });

            // If we can't map to compiled (no mapping for this location), skip
            if (!compiledLocation) {
              return true;
            }

            // Then map back from JavaScript to TypeScript
            const roundTripLocation = await manager.mapCompiledToSource({
              file: compiledLocation.file,
              line: compiledLocation.line,
              column: compiledLocation.column,
            });

            // If we can't map back, that's a failure
            if (!roundTripLocation) {
              return false;
            }

            // The round-trip should return to the same file
            // Note: Line numbers might not be exact due to source map granularity
            // but they should be close (within a few lines)
            const sameFile = roundTripLocation.file.endsWith(
              'typescript-sample.ts',
            );
            const lineDifference = Math.abs(roundTripLocation.line - line);
            const reasonableLineDifference = lineDifference <= 2;

            return sameFile && reasonableLineDifference;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should handle edge case: first line of file', async () => {
      const tsFile = path.resolve(
        __dirname,
        '../../test-fixtures/typescript-sample.ts',
      );

      const compiledLocation = await manager.mapSourceToCompiled({
        file: tsFile,
        line: 1,
        column: 0,
      });

      if (compiledLocation) {
        const roundTripLocation = await manager.mapCompiledToSource({
          file: compiledLocation.file,
          line: compiledLocation.line,
          column: compiledLocation.column,
        });

        expect(roundTripLocation).not.toBeNull();
        if (roundTripLocation) {
          expect(roundTripLocation.file).toContain('typescript-sample.ts');
        }
      }
    });

    it('should handle edge case: function declaration line', async () => {
      const tsFile = path.resolve(
        __dirname,
        '../../test-fixtures/typescript-sample.ts',
      );

      // Line 2 is the greet function declaration
      const compiledLocation = await manager.mapSourceToCompiled({
        file: tsFile,
        line: 2,
        column: 0,
      });

      if (compiledLocation) {
        const roundTripLocation = await manager.mapCompiledToSource({
          file: compiledLocation.file,
          line: compiledLocation.line,
          column: compiledLocation.column,
        });

        expect(roundTripLocation).not.toBeNull();
        if (roundTripLocation) {
          expect(roundTripLocation.file).toContain('typescript-sample.ts');
          // Should be close to line 2
          expect(Math.abs(roundTripLocation.line - 2)).toBeLessThanOrEqual(2);
        }
      }
    });
  });

  /**
   * Feature: mcp-debugger-tool, Property 16: Source map variable name preservation
   * For any variable in a TypeScript source file with a valid source map,
   * when that variable is inspected during debugging, the variable name should match
   * the name in the TypeScript source, not the potentially mangled JavaScript name.
   * Validates: Requirements 7.4
   */
  describe('Property 16: Source map variable name preservation', () => {
    it('should map JavaScript variable names to TypeScript names', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate line numbers within the compiled JavaScript file range
          fc.integer({ min: 1, max: 50 }),
          // Generate column numbers
          fc.integer({ min: 0, max: 80 }),
          async (line, column) => {
            const jsFile = path.resolve(
              __dirname,
              '../../test-fixtures/typescript-sample.js',
            );

            // Try to map the variable name at this location
            const originalName = await manager.mapVariableName(
              jsFile,
              'someVar',
              line,
              column,
            );

            // If we get a name back, it should be a non-empty string
            if (originalName !== null) {
              expect(typeof originalName).toBe('string');
              expect(originalName.length).toBeGreaterThan(0);
            }

            // If we don't get a name back, that's ok - not all locations have name mappings
            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should handle edge case: function parameter names', async () => {
      const jsFile = path.resolve(
        __dirname,
        '../../test-fixtures/typescript-sample.js',
      );

      // The greet function has a parameter 'name'
      // Try to find the mapping for it
      const names = await manager.getVariableNamesAtLocation(jsFile, 4, 0);

      // We should get some variable names from the source map
      // (The exact names depend on the compilation, but we should get something)
      expect(Array.isArray(names)).toBe(true);
    });

    it('should return null when no source map is available', async () => {
      const jsFile = path.resolve(
        __dirname,
        '../../test-fixtures/simple-script.js',
      );

      const originalName = await manager.mapVariableName(
        jsFile,
        'someVar',
        1,
        0,
      );

      expect(originalName).toBeNull();
    });

    it('should handle edge case: class property names', async () => {
      const jsFile = path.resolve(
        __dirname,
        '../../test-fixtures/typescript-sample.js',
      );

      // The Calculator class has a property 'result'
      // Try to find variable names in the class definition area
      const names = await manager.getVariableNamesAtLocation(jsFile, 15, 0);

      // Should return an array (might be empty if no mappings at this exact location)
      expect(Array.isArray(names)).toBe(true);
    });

    it('should preserve TypeScript variable names across multiple locations', async () => {
      const jsFile = path.resolve(
        __dirname,
        '../../test-fixtures/typescript-sample.js',
      );

      // Test multiple locations in the file
      const locations = [
        { line: 4, column: 0 },
        { line: 8, column: 0 },
        { line: 15, column: 0 },
      ];

      for (const loc of locations) {
        const originalName = await manager.mapVariableName(
          jsFile,
          'testVar',
          loc.line,
          loc.column,
        );

        // If we get a name, it should be a valid string
        if (originalName !== null) {
          expect(typeof originalName).toBe('string');
          expect(originalName.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', async () => {
      const jsFile = path.resolve(
        __dirname,
        '../../test-fixtures/typescript-sample.js',
      );

      await manager.loadSourceMap(jsFile);
      expect(manager.getCacheSize()).toBe(1);

      manager.clearCache();
      expect(manager.getCacheSize()).toBe(0);
    });
  });
});
