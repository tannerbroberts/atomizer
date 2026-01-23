# Anonymous Arrow Function Default

**Pattern:** `export default () => {}`

## Files

- `Component.tsx` - Anonymous arrow function as default export
- `Consumer.tsx` - Imports the anonymous default

## Known Bug

❌ **BUG:** Anonymous defaults are NOT traced for dependencies

### Root Cause

`DependencyTracer.ts:59-65` has early exit when `declName === 'anonymous'`:

```typescript
if (!declName || declName === 'anonymous') {
  return {  // ← EARLY EXIT - no dependency analysis!
    declaration: declInfo,
    internal,
    external,
  };
}
```

### Expected Behavior

- ✅ Consumer.tsx should be found as external dependant
- ✅ JSX usage should be detected
- ✅ Proper restructuring should occur

### Actual Behavior

- ❌ Anonymous default skipped in tracing
- ❌ Consumer.tsx NOT found in external dependants
- ❌ Usage count = 0 (should be 1)
- ⚠️ File-level imports work, but code-level analysis fails
