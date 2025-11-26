import * as fc from 'fast-check';
import * as path from 'path';
import { DebugSession, SessionState } from './debug-session';

describe('VariableInspector', () => {
  // Feature: mcp-debugger-tool, Property 8: Expression evaluation correctness
  // For any valid JavaScript expression and paused Target Process,
  // when that expression is evaluated in the current execution context,
  // then the result should match what would be computed if the expression were executed at that point in the code.
  // Validates: Requirements 3.4
  it('should evaluate expressions correctly in the current context', async () => {
    const testFile = path.join(
      __dirname,
      '../../test-fixtures/expression-test.js',
    );

    const session = new DebugSession('test-eval', {
      command: 'node',
      args: [testFile],
    });

    try {
      await session.start();
      expect(session.getState()).toBe(SessionState.PAUSED);

      // Resume to get past the initial --inspect-brk pause
      await session.resume();

      // Wait for the debugger statement in the test function
      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(session.getState()).toBe(SessionState.PAUSED);

      // Test primitive value expressions
      const numResult = await session.evaluateExpression('num');
      expect(numResult.value).toBe(42);
      expect(numResult.type).toBe('number');

      const strResult = await session.evaluateExpression('str');
      expect(strResult.value).toBe('hello');
      expect(strResult.type).toBe('string');

      const boolResult = await session.evaluateExpression('bool');
      expect(boolResult.value).toBe(true);
      expect(boolResult.type).toBe('boolean');

      const nullResult = await session.evaluateExpression('nullVal');
      expect(nullResult.value).toBe(null);

      const undefinedResult = await session.evaluateExpression('undefinedVal');
      expect(undefinedResult.value).toBe(undefined);
      expect(undefinedResult.type).toBe('undefined');

      // Test arithmetic expressions
      const arithmeticResult = await session.evaluateExpression('num + 10');
      expect(arithmeticResult.value).toBe(52);
      expect(arithmeticResult.type).toBe('number');

      // Test string concatenation
      const concatResult = await session.evaluateExpression('str + " world"');
      expect(concatResult.value).toBe('hello world');
      expect(concatResult.type).toBe('string');

      // Test array access
      const arrayResult = await session.evaluateExpression('arr[1]');
      expect(arrayResult.value).toBe(2);
      expect(arrayResult.type).toBe('number');

      // Test object property access
      const objPropResult = await session.evaluateExpression('obj.x');
      expect(objPropResult.value).toBe(10);
      expect(objPropResult.type).toBe('number');

      // Test nested object access
      const nestedResult = await session.evaluateExpression('obj.nested.z');
      expect(nestedResult.value).toBe(30);
      expect(nestedResult.type).toBe('number');

      // Test boolean expressions
      const comparisonResult = await session.evaluateExpression('num > 40');
      expect(comparisonResult.value).toBe(true);
      expect(comparisonResult.type).toBe('boolean');

      // Test typeof operator
      const typeofResult = await session.evaluateExpression('typeof str');
      expect(typeofResult.value).toBe('string');
      expect(typeofResult.type).toBe('string');
    } finally {
      await session.cleanup();
    }
  }, 30000);

  // Property-based test: Expression evaluation with generated expressions
  it('should correctly evaluate arithmetic expressions with random values', async () => {
    const testFile = path.join(
      __dirname,
      '../../test-fixtures/expression-test.js',
    );

    const session = new DebugSession('test-eval-pbt', {
      command: 'node',
      args: [testFile],
    });

    try {
      await session.start();
      expect(session.getState()).toBe(SessionState.PAUSED);

      // Resume to get past the initial --inspect-brk pause
      await session.resume();

      // Wait for the debugger statement in the test function
      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(session.getState()).toBe(SessionState.PAUSED);

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: -1000, max: 1000 }),
          fc.integer({ min: 1, max: 1000 }), // Avoid 0 to prevent -0 edge case
          async (a, b) => {
            // Test addition
            const addResult = await session.evaluateExpression(`${a} + ${b}`);
            expect(addResult.value).toBe(a + b);
            expect(addResult.type).toBe('number');

            // Test subtraction
            const subResult = await session.evaluateExpression(`${a} - ${b}`);
            expect(subResult.value).toBe(a - b);
            expect(subResult.type).toBe('number');

            // Test multiplication
            const mulResult = await session.evaluateExpression(`${a} * ${b}`);
            expect(mulResult.value).toBe(a * b);
            expect(mulResult.type).toBe('number');

            // Test comparison
            const gtResult = await session.evaluateExpression(`${a} > ${b}`);
            expect(gtResult.value).toBe(a > b);
            expect(gtResult.type).toBe('boolean');

            const eqResult = await session.evaluateExpression(`${a} === ${b}`);
            expect(eqResult.value).toBe(a === b);
            expect(eqResult.type).toBe('boolean');
          },
        ),
        { numRuns: 100 },
      );
    } finally {
      await session.cleanup();
    }
  }, 60000);

  // Test error handling for invalid expressions
  it('should handle invalid expressions gracefully', async () => {
    const testFile = path.join(
      __dirname,
      '../../test-fixtures/expression-test.js',
    );

    const session = new DebugSession('test-eval-error', {
      command: 'node',
      args: [testFile],
    });

    try {
      await session.start();
      expect(session.getState()).toBe(SessionState.PAUSED);

      // Resume to get past the initial --inspect-brk pause
      await session.resume();

      // Wait for the debugger statement in the test function
      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(session.getState()).toBe(SessionState.PAUSED);

      // Test undefined variable
      await expect(
        session.evaluateExpression('nonExistentVariable'),
      ).rejects.toThrow();

      // Test syntax error
      await expect(
        session.evaluateExpression('this is not valid javascript'),
      ).rejects.toThrow();
    } finally {
      await session.cleanup();
    }
  }, 30000);

  // Test that evaluation requires paused state
  it('should throw error when evaluating in non-paused state', async () => {
    const testFile = path.join(
      __dirname,
      '../../test-fixtures/simple-script.js',
    );

    const session = new DebugSession('test-eval-state', {
      command: 'node',
      args: [testFile],
    });

    try {
      await session.start();

      // Resume execution
      await session.resume();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Try to evaluate while running
      await expect(session.evaluateExpression('1 + 1')).rejects.toThrow(
        'Process must be paused',
      );
    } finally {
      await session.cleanup();
    }
  }, 30000);

  // Feature: mcp-debugger-tool, Property 7: Object inspection completeness
  // For any object reference in a paused Target Process,
  // when that object is inspected, then all enumerable properties of that object should be returned with their current values.
  // Validates: Requirements 3.3
  it('should return all enumerable properties when inspecting objects', async () => {
    const testFile = path.join(
      __dirname,
      '../../test-fixtures/expression-test.js',
    );

    const session = new DebugSession('test-obj-inspect', {
      command: 'node',
      args: [testFile],
    });

    try {
      await session.start();
      expect(session.getState()).toBe(SessionState.PAUSED);

      // Resume to get past the initial --inspect-brk pause
      await session.resume();

      // Wait for the debugger statement in the test function
      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(session.getState()).toBe(SessionState.PAUSED);

      // Evaluate an object expression to get its objectId
      const objResult = await session.evaluateExpression('obj');
      expect(objResult.type).toBe('object');
      expect(objResult.objectId).toBeDefined();

      // Get the object's properties
      const properties = await session.getObjectProperties(objResult.objectId!);

      // Verify all expected properties are present
      const propertyNames = properties.map((p) => p.name);
      expect(propertyNames).toContain('x');
      expect(propertyNames).toContain('y');
      expect(propertyNames).toContain('nested');

      // Verify property values
      const xProp = properties.find((p) => p.name === 'x');
      expect(xProp?.value).toBe(10);
      expect(xProp?.type).toBe('number');

      const yProp = properties.find((p) => p.name === 'y');
      expect(yProp?.value).toBe(20);
      expect(yProp?.type).toBe('number');

      const nestedProp = properties.find((p) => p.name === 'nested');
      expect(nestedProp?.type).toBe('object');

      // Test array inspection
      const arrResult = await session.evaluateExpression('arr');
      expect(arrResult.type).toBe('object');
      expect(arrResult.objectId).toBeDefined();

      const arrProperties = await session.getObjectProperties(
        arrResult.objectId!,
      );

      // Arrays have numeric indices as properties
      const indices = arrProperties.filter((p) => !isNaN(Number(p.name)));
      expect(indices.length).toBeGreaterThanOrEqual(3);

      // Verify array values
      const val0 = arrProperties.find((p) => p.name === '0');
      expect(val0?.value).toBe(1);

      const val1 = arrProperties.find((p) => p.name === '1');
      expect(val1?.value).toBe(2);

      const val2 = arrProperties.find((p) => p.name === '2');
      expect(val2?.value).toBe(3);
    } finally {
      await session.cleanup();
    }
  }, 30000);

  // Test nested object inspection
  it('should inspect nested objects with depth limit', async () => {
    const testFile = path.join(
      __dirname,
      '../../test-fixtures/expression-test.js',
    );

    const session = new DebugSession('test-nested-inspect', {
      command: 'node',
      args: [testFile],
    });

    try {
      await session.start();
      expect(session.getState()).toBe(SessionState.PAUSED);

      // Resume to get past the initial --inspect-brk pause
      await session.resume();

      // Wait for the debugger statement in the test function
      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(session.getState()).toBe(SessionState.PAUSED);

      // Evaluate an object expression to get its objectId
      const objResult = await session.evaluateExpression('obj');
      expect(objResult.objectId).toBeDefined();

      // Inspect with depth 2
      const inspected = await session.inspectObject(objResult.objectId!, 2);

      // Verify top-level properties
      expect(inspected.x).toBe(10);
      expect(inspected.y).toBe(20);
      expect(inspected.nested).toBeDefined();

      // Verify nested properties
      expect(inspected.nested.z).toBe(30);
    } finally {
      await session.cleanup();
    }
  }, 30000);

  // Property-based test for object inspection
  it('should correctly inspect objects with various property types', async () => {
    const testFile = path.join(
      __dirname,
      '../../test-fixtures/expression-test.js',
    );

    const session = new DebugSession('test-obj-pbt', {
      command: 'node',
      args: [testFile],
    });

    try {
      await session.start();
      expect(session.getState()).toBe(SessionState.PAUSED);

      // Resume to get past the initial --inspect-brk pause
      await session.resume();

      // Wait for the debugger statement in the test function
      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(session.getState()).toBe(SessionState.PAUSED);

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            num: fc.integer(),
            str: fc.string(),
            bool: fc.boolean(),
          }),
          async (testObj) => {
            // Create an object in the debugged context
            const objStr = JSON.stringify(testObj);
            const result = await session.evaluateExpression(`(${objStr})`);

            expect(result.type).toBe('object');
            expect(result.objectId).toBeDefined();

            // Get properties
            const properties = await session.getObjectProperties(
              result.objectId!,
            );
            const propertyNames = properties.map((p) => p.name);

            // Verify all properties are present
            expect(propertyNames).toContain('num');
            expect(propertyNames).toContain('str');
            expect(propertyNames).toContain('bool');

            // Verify values match
            const numProp = properties.find((p) => p.name === 'num');
            expect(numProp?.value).toBe(testObj.num);

            const strProp = properties.find((p) => p.name === 'str');
            expect(strProp?.value).toBe(testObj.str);

            const boolProp = properties.find((p) => p.name === 'bool');
            expect(boolProp?.value).toBe(testObj.bool);
          },
        ),
        { numRuns: 50 }, // Reduced runs since this involves actual debugging
      );
    } finally {
      await session.cleanup();
    }
  }, 60000);

  // Feature: mcp-debugger-tool, Property 21: Complex object serialization with type information
  // For any complex object (arrays, nested objects, functions) returned from variable inspection,
  // the serialized representation should include type information for each value and property.
  // Validates: Requirements 9.3
  it('should serialize complex objects with type information', async () => {
    const testFile = path.join(
      __dirname,
      '../../test-fixtures/expression-test.js',
    );

    const session = new DebugSession('test-complex-serialize', {
      command: 'node',
      args: [testFile],
    });

    try {
      await session.start();
      expect(session.getState()).toBe(SessionState.PAUSED);

      // Resume to get past the initial --inspect-brk pause
      await session.resume();

      // Wait for the debugger statement in the test function
      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(session.getState()).toBe(SessionState.PAUSED);

      // Test array serialization with type info
      const arrResult = await session.evaluateExpression('arr');
      expect(arrResult.type).toBe('object');
      expect(arrResult.description).toBeDefined();
      expect(arrResult.objectId).toBeDefined();

      // Test nested object serialization with type info
      const objResult = await session.evaluateExpression('obj');
      expect(objResult.type).toBe('object');
      expect(objResult.description).toBeDefined();
      expect(objResult.objectId).toBeDefined();

      // Get properties and verify type information is included
      const properties = await session.getObjectProperties(objResult.objectId!);

      for (const prop of properties) {
        // Each property should have a type
        expect(prop.type).toBeDefined();
        expect(typeof prop.type).toBe('string');

        // Verify type matches value
        if (prop.name === 'x' || prop.name === 'y') {
          expect(prop.type).toBe('number');
          expect(typeof prop.value).toBe('number');
        } else if (prop.name === 'nested') {
          expect(prop.type).toBe('object');
        }
      }

      // Test null serialization
      const nullResult = await session.evaluateExpression('nullVal');
      expect(nullResult.value).toBe(null);
      expect(nullResult.type).toBeDefined();

      // Test undefined serialization
      const undefinedResult = await session.evaluateExpression('undefinedVal');
      expect(undefinedResult.value).toBe(undefined);
      expect(undefinedResult.type).toBe('undefined');
    } finally {
      await session.cleanup();
    }
  }, 30000);

  // Property-based test for complex object serialization
  it('should maintain type information for all property types', async () => {
    const testFile = path.join(
      __dirname,
      '../../test-fixtures/expression-test.js',
    );

    const session = new DebugSession('test-type-info-pbt', {
      command: 'node',
      args: [testFile],
    });

    try {
      await session.start();
      expect(session.getState()).toBe(SessionState.PAUSED);

      // Resume to get past the initial --inspect-brk pause
      await session.resume();

      // Wait for the debugger statement in the test function
      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(session.getState()).toBe(SessionState.PAUSED);

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            numProp: fc.integer(),
            strProp: fc.string(),
            boolProp: fc.boolean(),
            arrProp: fc.array(fc.integer(), { maxLength: 5 }),
            nestedProp: fc.record({
              innerNum: fc.integer(),
              innerStr: fc.string(),
            }),
          }),
          async (complexObj) => {
            // Create a complex object in the debugged context
            const objStr = JSON.stringify(complexObj);
            const result = await session.evaluateExpression(`(${objStr})`);

            // Verify top-level type information
            expect(result.type).toBe('object');
            expect(result.objectId).toBeDefined();

            // Get properties and verify each has type information
            const properties = await session.getObjectProperties(
              result.objectId!,
            );

            for (const prop of properties) {
              expect(prop.type).toBeDefined();
              expect(typeof prop.type).toBe('string');

              // Verify type matches expected type
              if (prop.name === 'numProp') {
                expect(prop.type).toBe('number');
              } else if (prop.name === 'strProp') {
                expect(prop.type).toBe('string');
              } else if (prop.name === 'boolProp') {
                expect(prop.type).toBe('boolean');
              } else if (
                prop.name === 'arrProp' ||
                prop.name === 'nestedProp'
              ) {
                expect(prop.type).toBe('object');
              }
            }

            // Verify nested object has type information
            const nestedProp = properties.find((p) => p.name === 'nestedProp');
            if (
              nestedProp &&
              nestedProp.value &&
              typeof nestedProp.value === 'object' &&
              nestedProp.value.objectId
            ) {
              const nestedProps = await session.getObjectProperties(
                nestedProp.value.objectId,
              );

              for (const nested of nestedProps) {
                expect(nested.type).toBeDefined();
                expect(typeof nested.type).toBe('string');
              }
            }
          },
        ),
        { numRuns: 30 }, // Reduced runs for performance
      );
    } finally {
      await session.cleanup();
    }
  }, 60000);
});
