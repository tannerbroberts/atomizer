# Object Literal Default Export

**Pattern:** `export default { ... }`

## Files

- `config.ts` - Object literal as default export
- `App.ts` - Imports and uses config values

## Unknown Behavior

❓ **Need Investigation:**

- How is object default tracked?
- Can it find consumers of this config?
- What name is used for dependency tracking?
- Does property access get traced?
