// src/setupTests.js
import '@testing-library/jest-dom';

// Polyfill for Node 18+ (React Testing Library expects setImmediate/clearImmediate)
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
}
if (typeof global.clearImmediate === 'undefined') {
  global.clearImmediate = (id) => clearTimeout(id);
}
