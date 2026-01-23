# Re-exported Default (Barrel Pattern)

**Pattern:** `const X = ...; export default X;` + barrel re-export

## Files

- `Button.tsx` - Const declaration + default export
- `index.ts` - Barrel file re-exporting as named export
- `App.tsx` - Imports through barrel

## Expected Behavior

✅ **Should Work:** Uses identifier name for tracking

- Declaration uses identifier name (`Button`)
- Re-export chain followed correctly
- App.tsx found as final consumer
- Multi-level dependency resolution works
