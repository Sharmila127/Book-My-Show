import '@testing-library/jest-dom';

// Polyfill setImmediate/clearImmediate for Node 18+
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
}

if (typeof global.clearImmediate === 'undefined') {
  global.clearImmediate = (id) => clearTimeout(id);
}
