// Test: Named imports with aliases should be tracked
// Bug potential: When "foo" is imported as "bar", usage of "bar" might not be traced back to "foo"

export const originalName = 42;
export function originalFunction() { return "hello"; }

// The consuming file would do:
// import { originalName as aliasedName } from './aliased-imports'
// aliasedName + 1  <-- This usage must be tracked
