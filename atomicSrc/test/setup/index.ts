import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// Mock ResizeObserver for tests
globalThis.ResizeObserver = class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
};
