# Atomizer Test Suite

This directory contains comprehensive tests for the atomizer's usage tracking functionality.

## Running Tests

```bash
# Run all tests
npm test

# Run individual test suites
npm run test:basic   # Basic functionality tests
npm run test:bugs    # Bug-finding tests  
npm run test:stress  # Creative stress tests
```

## Test Results

**All 55 tests passing** ✅

- Basic tests: 31/31
- Bug-finding tests: 10/10
- Stress tests: 14/14

## Test Suites

### 1. Basic Tests (`run-tests.js`)
Tests fundamental usage tracking for:
- Aliased imports (`import { x as y }`)
- Re-export chains (multi-level re-exports)
- Namespace imports (`import * as NS`)
- String false positives (identifiers in strings shouldn't count)
- Variable shadowing detection
- Barrel files with `export *`
- Circular dependencies
- Internal usage within same file
- Destructuring exports
- Type-only imports
- TypeScript enums
- Default + named exports
- CommonJS patterns
- Dynamic imports
- JSX component usage
- Comment handling

### 2. Bug-Finding Tests (`find-bugs.js`)
Focused tests designed to find edge cases:
- Namespace property access (`NS.foo` tracking)
- Rename chain tracking (deeply nested renames)
- `export *` forwarding
- Default export rename chains
- Shadowing over-detection
- String/comment/regex false positives
- Type-only import tracking
- Mixed import statement handling
- Destructuring export names
- Identifier substring matching

### 3. Stress Tests (`stress-tests.js`)
Creative patterns that might break tracking:
- Computed property access (`obj[key]`)
- Spread operator usage
- Async/await patterns
- TypeScript decorators
- Tagged template literals
- Optional chaining (`?.`)
- Proxy and Reflect
- Generator functions
- Class expressions
- Symbols and iterators
- Private fields (`#`)
- Unicode identifiers
- Very long re-export chains (10 levels)
- Same name from multiple files

## Known Bugs Found (Now Fixed)

The following bugs were discovered during testing and have been fixed:

### 1. Variable Shadowing Over-Detection ✅ FIXED
**Solution:** Implemented `ScopeAnalyzer` class that uses AST-based scope analysis instead of regex matching.

### 2. Object Key False Positives ✅ FIXED
**Solution:** ScopeAnalyzer now skips property keys in object literals (e.g., `{ identifier: value }`).

### 3. Regex Literal False Positives ✅ FIXED
**Solution:** Added regex literal stripping to the fallback regex checker.

### 4. Unicode Identifier Tracking ✅ FIXED
**Solution:** Updated regex to use Unicode-aware word boundary matching with `\p{L}\p{N}` character classes.

### 5. JSX Component Usage ✅ FIXED
**Solution:** ScopeAnalyzer now handles `JSXIdentifier` nodes for tracking `<ComponentName />` usage.

## Architecture Improvements Made

### ScopeAnalyzer (`src/ScopeAnalyzer.js`)
New module that provides proper scope-aware identifier analysis:
- Parses code into AST for accurate analysis
- Tracks variable declarations in each scope
- Properly handles shadowing (local variables that shadow imports)
- Supports JSX identifier nodes
- Skips non-reference uses (object keys, member expression properties)
- Falls back to regex for unparseable code

## Test Fixtures

Edge case fixtures are in `tests/test-fixtures/edge-cases/`:

| File | Tests |
|------|-------|
| `aliased-imports.ts` | Named imports with aliases |
| `aliased-consumer.ts` | Consumer of aliased imports |
| `re-export-chain.ts` | Start of re-export chain |
| `reexport-level1.ts` | First re-export level |
| `reexport-level2.ts` | Second re-export with rename |
| `deep-consumer.ts` | Consumer through re-export chain |
| `namespace-import.ts` | Module for namespace import |
| `namespace-consumer.ts` | `import * as NS` patterns |
| `string-false-positive.ts` | Identifiers in strings |
| `shadowing.ts` | Variable shadowing cases |
| `dynamic-import.ts` | Dynamic import source |
| `dynamic-consumer.ts` | `import()` patterns |
| `export-star.ts` | `export *` source |
| `barrel-file.ts` | Barrel file with `export *` |
| `barrel-consumer.ts` | Consumer of barrel exports |
| `commonjs-*.js` | CommonJS patterns |
| `type-only-import.ts` | TypeScript types/interfaces |
| `type-consumer.ts` | `import type` patterns |
| `circular-a.ts` / `circular-b.ts` | Circular dependencies |
| `internal-usage.ts` | Same-file usage |
| `jsx-*.tsx` | JSX component patterns |
| `destructuring.ts` | Destructuring exports |
| `enum-*.ts` | TypeScript enum patterns |
| `default-and-named.ts` | Mixed export patterns |
| `comment-edge-cases.ts` | Comment handling |

## Adding New Tests

1. Create fixture files in `test-fixtures/edge-cases/`
2. Add test function in appropriate test file
3. Use `assertUsageFound()` helper for usage assertions
4. Document expected vs actual behavior

## CI Integration

Tests exit with code 1 if any bugs are found, making them suitable for CI:

```yaml
- run: npm test
```
