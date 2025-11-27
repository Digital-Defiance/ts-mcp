// Test fixture that crashes with an uncaught exception
// The process will pause at the first line due to --inspect-brk
// When resumed, it will throw an uncaught exception

console.log('Starting crash test...');
console.log('About to crash...');
console.error('CRASH TEST: About to throw exception');
throw new Error('Intentional crash for testing');
