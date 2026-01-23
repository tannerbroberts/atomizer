# Mixed Exports (Default + Named)

**Pattern:** File with both default and named exports

## Files

- `utils.ts` - Contains both named exports (`helper`, `format`) and default export (`mainUtil`)
- `consumer-default.ts` - Imports only the default export
- `consumer-named.ts` - Imports only the named exports

## Expected Behavior

✅ **Should Work:** Both export types tracked

- Both default and named exports indexed
- Default export has name `mainUtil`
- Named exports tracked separately
- File placed at LCA of ALL consumers (both default and named)
- File should NOT be split (mixed exports stay together)
