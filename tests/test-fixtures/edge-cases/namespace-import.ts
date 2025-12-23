// Test: Namespace imports (import * as X) 
// Bug potential: Usage like X.foo might not be tracked

export const alpha = 1;
export const beta = 2;
export function gamma() { return 3; }
