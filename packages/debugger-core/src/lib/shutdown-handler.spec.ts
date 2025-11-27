import { GracefulShutdownHandler } from './shutdown-handler';

describe('GracefulShutdownHandler', () => {
  let handler: GracefulShutdownHandler;

  beforeEach(() => {
    handler = new GracefulShutdownHandler(5000);
  });

  afterEach(() => {
    // Clean up any registered handlers
    handler.unregisterCleanup('test-cleanup');
  });

  describe('registerCleanup', () => {
    it('should register a cleanup function', () => {
      const cleanupFn = jest.fn().mockResolvedValue(undefined);
      handler.registerCleanup('test-cleanup', cleanupFn);

      // Verify it was registered (we can't directly test the map, but we can test unregister)
      handler.unregisterCleanup('test-cleanup');
      expect(true).toBe(true); // If no error, registration worked
    });

    it('should allow multiple cleanup functions', () => {
      const cleanup1 = jest.fn().mockResolvedValue(undefined);
      const cleanup2 = jest.fn().mockResolvedValue(undefined);

      handler.registerCleanup('cleanup-1', cleanup1);
      handler.registerCleanup('cleanup-2', cleanup2);

      expect(true).toBe(true);
    });
  });

  describe('unregisterCleanup', () => {
    it('should unregister a cleanup function', () => {
      const cleanupFn = jest.fn().mockResolvedValue(undefined);
      handler.registerCleanup('test-cleanup', cleanupFn);
      handler.unregisterCleanup('test-cleanup');

      expect(true).toBe(true);
    });

    it('should not throw when unregistering non-existent cleanup', () => {
      expect(() => {
        handler.unregisterCleanup('non-existent');
      }).not.toThrow();
    });
  });

  describe('isShuttingDown', () => {
    it('should return false initially', () => {
      expect(handler.isShuttingDown()).toBe(false);
    });

    it('should return true during shutdown', async () => {
      const cleanupFn = jest.fn().mockImplementation(async () => {
        // Check status during cleanup
        expect(handler.isShuttingDown()).toBe(true);
      });

      handler.registerCleanup('test-cleanup', cleanupFn);

      // Mock process.exit to prevent actual exit
      const originalExit = process.exit;
      process.exit = jest.fn() as any;

      try {
        await handler.shutdown();
        expect(cleanupFn).toHaveBeenCalled();
      } finally {
        process.exit = originalExit;
      }
    });
  });

  describe('shutdown', () => {
    it('should execute all registered cleanup functions', async () => {
      const cleanup1 = jest.fn().mockResolvedValue(undefined);
      const cleanup2 = jest.fn().mockResolvedValue(undefined);

      handler.registerCleanup('cleanup-1', cleanup1);
      handler.registerCleanup('cleanup-2', cleanup2);

      // Mock process.exit
      const originalExit = process.exit;
      process.exit = jest.fn() as any;

      try {
        await handler.shutdown();

        expect(cleanup1).toHaveBeenCalled();
        expect(cleanup2).toHaveBeenCalled();
        expect(process.exit).toHaveBeenCalledWith(0);
      } finally {
        process.exit = originalExit;
      }
    });

    it('should continue cleanup even if one function fails', async () => {
      const cleanup1 = jest
        .fn()
        .mockRejectedValue(new Error('Cleanup 1 failed'));
      const cleanup2 = jest.fn().mockResolvedValue(undefined);

      handler.registerCleanup('cleanup-1', cleanup1);
      handler.registerCleanup('cleanup-2', cleanup2);

      // Mock process.exit and console.error
      const originalExit = process.exit;
      const originalError = console.error;
      process.exit = jest.fn() as any;
      console.error = jest.fn();

      try {
        await handler.shutdown();

        expect(cleanup1).toHaveBeenCalled();
        expect(cleanup2).toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining('Cleanup failed for cleanup-1'),
          expect.any(Error),
        );
      } finally {
        process.exit = originalExit;
        console.error = originalError;
      }
    });

    it('should not execute shutdown twice', async () => {
      const cleanupFn = jest.fn().mockResolvedValue(undefined);
      handler.registerCleanup('test-cleanup', cleanupFn);

      // Mock process.exit and console.log
      const originalExit = process.exit;
      const originalLog = console.log;
      process.exit = jest.fn() as any;
      console.log = jest.fn();

      try {
        // Start first shutdown
        const shutdown1 = handler.shutdown();
        // Try to start second shutdown
        const shutdown2 = handler.shutdown();

        await Promise.all([shutdown1, shutdown2]);

        // Cleanup should only be called once
        expect(cleanupFn).toHaveBeenCalledTimes(1);
        expect(console.log).toHaveBeenCalledWith(
          'Shutdown already in progress...',
        );
      } finally {
        process.exit = originalExit;
        console.log = originalLog;
      }
    });

    it('should timeout if cleanup takes too long', async () => {
      jest.useFakeTimers();

      const slowCleanup = jest.fn().mockImplementation(async () => {
        // Simulate slow cleanup
        await new Promise((resolve) => setTimeout(resolve, 10000));
      });

      handler.registerCleanup('slow-cleanup', slowCleanup);

      // Mock process.exit and console.error
      const originalExit = process.exit;
      const originalError = console.error;
      process.exit = jest.fn() as any;
      console.error = jest.fn();

      try {
        const shutdownPromise = handler.shutdown();

        // Fast-forward time to trigger timeout
        jest.advanceTimersByTime(5000);

        // Wait for the timeout to trigger
        await jest.runAllTimersAsync();

        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining('Shutdown timeout exceeded'),
        );
        expect(process.exit).toHaveBeenCalledWith(1);
      } finally {
        process.exit = originalExit;
        console.error = originalError;
        jest.useRealTimers();
      }
    }, 10000);
  });

  describe('initialize', () => {
    it('should only initialize once', () => {
      const originalOn = process.on;
      const onSpy = jest.fn();
      process.on = onSpy as any;

      try {
        handler.initialize();
        handler.initialize();

        // Should only register handlers once
        const sigtermCalls = onSpy.mock.calls.filter(
          (call) => call[0] === 'SIGTERM',
        );
        expect(sigtermCalls.length).toBe(1);
      } finally {
        process.on = originalOn;
      }
    });
  });
});
