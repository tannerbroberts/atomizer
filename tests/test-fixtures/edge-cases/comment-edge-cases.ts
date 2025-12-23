// Test: Identifiers in comments should NOT be counted

export const commentTarget = 42;

// This mentions commentTarget but should not count as usage

/*
 * Multi-line comment with commentTarget
 * should also not count
 */

/**
 * JSDoc mentioning commentTarget
 * @param commentTarget - this parameter shadows but is in JSDoc
 */
function documented(x: number) {
  // Actually using it here
  return commentTarget + x;
}

// Tricky: code after comment on same line
const value = /* commentTarget in comment */ commentTarget; // commentTarget after
