// Test: Identifiers in strings should NOT be counted as usage
// Bug potential: Regex-based matching might count "foo" in strings

export const targetSymbol = 123;

// This should NOT count as usage of targetSymbol:
const message = "The targetSymbol is important";
const template = `Using targetSymbol in template`;
const comment = 'targetSymbol in single quotes';

// This SHOULD count as usage:
const actualUsage = targetSymbol + 1;

// Edge case: What about regex literals?
const regex = /targetSymbol/;

// Edge case: Object key with same name
const obj = {
  targetSymbol: "different value"  // This is NOT using the export
};

// Edge case: JSX attribute string
// <div data-symbol="targetSymbol" /> -- NOT usage
