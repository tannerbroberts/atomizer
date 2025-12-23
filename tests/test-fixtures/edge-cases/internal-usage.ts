// Test: Internal usage within the same file

const helper = (x: number) => x * 2;

// helper is used internally by both of these
export const double = (n: number) => helper(n);
export const quadruple = (n: number) => helper(helper(n));

// This uses double internally
export const octuple = (n: number) => double(double(n));

// Mutual internal usage
export function funcA(x: number): number {
  if (x <= 0) return 1;
  return funcB(x - 1) * 2;
}

export function funcB(x: number): number {
  if (x <= 0) return 1;
  return funcA(x - 1) * 3;
}
