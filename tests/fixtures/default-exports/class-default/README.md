# Class Default Export

**Pattern:** `export default class Named {}`

## Files

- `Service.ts` - Named class as default export
- `App.ts` - Instantiates and uses the service

## Expected Behavior

✅ **Should Work:** Class defaults are well-supported

- Class name extracted: `UserService`
- Methods indexed
- Export marked as default
- Dependency tracking works correctly
