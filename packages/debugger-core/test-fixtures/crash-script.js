console.log('About to crash');
setTimeout(() => {
  throw new Error('Intentional crash');
}, 500);