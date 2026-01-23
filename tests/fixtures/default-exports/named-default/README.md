# Named Default Exports

**Pattern:** Named function with default export

## Files

- `Button.tsx` - Named default function component
- `Form.tsx` - Imports Button as default, exports named default Form
- `App.tsx` - Imports Form as default, exports named default App

## Expected Behavior

✅ **Should Work:** Named defaults are fully supported

- Declarations indexed with correct names (`Button`, `Form`, `App`)
- Dependencies traced correctly
- Structure computed properly: `App/Form/Button/index.tsx`
- All imports updated to relative paths

## This serves as the baseline for comparison with anonymous defaults.
