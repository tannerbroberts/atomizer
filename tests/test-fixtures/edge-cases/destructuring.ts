// Test: Destructuring patterns in declarations

// Object destructuring export
export const { extractedA, extractedB: renamedB } = { extractedA: 1, extractedB: 2 };

// Array destructuring export
export const [first, second, ...rest] = [1, 2, 3, 4, 5];

// Nested destructuring
export const { 
  outer: { inner: deepValue } 
} = { outer: { inner: "deep" } };

// Default values in destructuring
export const { withDefault = 10 } = {};
