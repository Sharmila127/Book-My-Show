// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// 🔹 Fix: polyfill for Node >= 18 where clearImmediate is missing
if (typeof global.clearImmediate === "undefined") {
  global.clearImmediate = (fn) => clearTimeout(setImmediate(fn));
}
