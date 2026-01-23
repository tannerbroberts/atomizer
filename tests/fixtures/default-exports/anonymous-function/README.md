# Anonymous Function Declaration Default

**Pattern:** `export default function() {}`

## Files

- `Component.tsx` - Anonymous function declaration as default export
- `Consumer.tsx` - Imports the anonymous default

## Known Bug

❌ **BUG:** Same as anonymous arrow - NOT traced for dependencies

This pattern should behave identically to anonymous arrow functions but uses function declaration syntax instead.
