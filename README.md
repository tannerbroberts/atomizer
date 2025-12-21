# Atomizer

A CLI tool to reorganize React/TypeScript folder structures using AST traversal and refactoring techniques. The goal is to enforce **"Architecture-as-Code"** where the file system reflects the React Render Tree (composability) first.

## Usage

```bash
# Analyze a project and see proposed changes
atomizer analyze <src-path>
atomizer analyze <src-path> --verbose   # Show detailed analysis
atomizer analyze <src-path> --json      # Output as JSON

# Execute the reorganization
atomizer run <src-path>                 # Reorganize in-place
atomizer run <src-path> --dry-run       # Preview changes without executing
atomizer run <src-path> --output <path> # Output to a different directory
```

---

## Architecture

The tool is composed of 5 main modules that execute in sequence:

### 1. FileInventory (`src/FileInventory.js`)

Scans the source directory using glob patterns:
- **Code files:** `.js`, `.jsx`, `.ts`, `.tsx`
- **Assets:** `.css`, `.scss`, `.less`, `.json`, `.svg`, `.png`, `.jpg`, etc.
- **Ignores:** `node_modules/`, `dist/`, `build/`, `__mocks__/`

### 2. ASTAnalyzer (`src/ASTAnalyzer.js`)

For each code file:
1. **Loads path aliases** from `tsconfig.json` or `jsconfig.json` (`compilerOptions.paths` and `baseUrl`)
2. **Parses AST** using `@typescript-eslint/typescript-estree`
3. **Extracts imports** — handles `import`, `require()`, dynamic `import()`, and re-exports (`export * from`)
4. **Resolves module paths** — converts every import specifier to an absolute file path on disk
5. **Extracts exports** — named exports, default exports, re-exports
6. **Extracts JSX elements** — all `<Component />` usages
7. **Classifies the file:**
   - **`component`** — exports a function/class that returns JSX
   - **`hook`** — exports functions starting with `use`
   - **`util`** — utility modules
   - **`type`** — TypeScript type-only files
   - **`config`** — configuration files
   - **`test`** — test files (`.test.*`, `.spec.*`)
   - **`barrel`** — index files that only re-export
   - **`root-config`** — project root config files (package.json, tsconfig.json, etc.)
   - **`asset`** — non-code files

### 3. GraphBuilder (`src/GraphBuilder.js`)

Builds **two distinct graphs** to handle React's specific structure:

#### Graph A: Render Tree (The Spine)
- **Nodes:** Components only
- **Edges:** Parent **renders** Child (composition)
- **Method:** Match JSX elements (`<Button />`) to their imported component file
- **Constraint:** Should be a DAG (warns if cycles detected)

#### Graph B: Dependency Graph (The Glue)
- **Nodes:** All files (components + non-components)
- **Edges:** File A **imports** File B
- **Purpose:** Track where hooks, utils, types, and assets are used

The `Graph` class provides:
- `getRoots()` / `getLeaves()` — find entry/exit points
- `getParents()` / `getChildren()` — traverse edges
- `getAncestors()` / `getDescendants()` — transitive traversal
- `hasCycle()` — DAG validation
- `topologicalSort()` — execution order

### 4. StructureComputer (`src/StructureComputer.js`)

Computes new file paths using **5 rules**:

#### Rule 1: Component Atomicity
Every component becomes a directory to allow future nesting:
```
src/Button.tsx → src/Button/index.tsx
```

#### Rule 2: Component Nesting (Private Children)
If Component B is rendered **only** by Component A:
```
src/A/B/index.tsx
```

#### Rule 3: Component Hoisting (Shared UI)
If Component B is rendered by **multiple** components (A and C):
- Compute the **Lowest Common Ancestor (LCA)** of A and C
- Move B to a `_components` folder at that level:
```
src/LCA/_components/B/index.tsx
```

#### Rule 4: Non-Component Colocation
After component structure is set, place non-components based on the dependency graph:
- **Private:** If `useHook.ts` is imported only by Component A → `src/A/hooks/useHook.ts`
- **Shared:** If `utils.ts` is imported by A and B → move to their LCA
- **Subdirectories by type:** `hooks/`, `utils/`, `types/`, `styles/`

#### Rule 5: Identify Roots
Entry points act as top-level anchors:
- Files with 0 importers in the render tree
- Common patterns: `app`, `index`, `main`, `root`, `_app`, `layout`, `page`
- Files in `pages/` or `app/` directories (Next.js)

#### Collision Resolution
If multiple files would move to the same destination, they're disambiguated:
```
mutations/cart.ts → mutations-cart.ts
queries/cart.ts   → queries-cart.ts
```

### 5. Migrator (`src/Migrator.js`)

Executes the computed moves safely:

1. **Creates backup** (for in-place migrations)
2. **Computes all import rewrites** before moving anything
3. **Creates directory structure**
4. **Moves files with updated imports** — rewrites import paths to match new locations
5. **Updates imports in unmoved files** — files that reference moved modules
6. **Cleans up empty directories**
7. **Rollback on failure** — restores from backup if migration fails

Import rewriting handles:
- `import ... from 'path'`
- `require('path')`
- `export ... from 'path'`
- Dynamic `import('path')`

---

## Output

### Analysis Output

```
📦 Starting Atomizer analysis...
   Source: /path/to/src

Step 1: Parsing & Inventory
   ✓ Found 42 files

Step 2: AST Analysis & Module Resolution
   ✓ Components: 15
   ✓ Non-Components: 27

Step 3: Building Dual Graphs
   ✓ Render Tree: 15 nodes, 23 edges
   ✓ Dependency Graph: 42 nodes, 67 edges

Step 4: Computing New Structure
   ✓ Computed 38 file moves

═══════════════════════════════════════
           ANALYSIS RESULTS
═══════════════════════════════════════

📦 Components:
   App (App.tsx)
   Header (components/Header.tsx)
   Button (components/Button.tsx)

📄 Non-Components:
   useAuth [hook] (hooks/useAuth.ts)
   formatDate [util] (utils/formatDate.ts)

🌳 Render Tree (Component Composition):
   └── App
       ├── Header
       │   └── Button
       └── Footer

📁 Proposed Structure:
   components/Button.tsx → App/Header/Button/index.tsx
   hooks/useAuth.ts → App/hooks/useAuth.ts
```

---

## Dependencies

- **[@typescript-eslint/typescript-estree](https://typescript-eslint.io/)** — TypeScript/JavaScript AST parser
- **[commander](https://github.com/tj/commander.js)** — CLI framework
- **[chalk](https://github.com/chalk/chalk)** — Terminal styling
- **[glob](https://github.com/isaacs/node-glob)** — File pattern matching

---

## Limitations

- **Alias resolution** requires a valid `tsconfig.json` or `jsconfig.json`
- **Dynamic imports** with variables are not resolved (only string literals)
- **CSS modules** and other non-JS imports are tracked but not analyzed
- **Circular component rendering** is warned but not prevented