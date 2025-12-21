const path = require('path');

/**
 * STRICT HIERARCHY RULES:
 * 
 * Inside src/, ONLY these patterns are allowed:
 *   1. Folders named after components/hooks (PascalCase for components, camelCase for hooks)
 *   2. Each folder has an index file that defines the main export
 *   3. Children (components, hooks, or support files) are nested inside their parent folder
 *   4. NO loose files at any level - everything is a folder with an index
 *   5. NO special directories like lib/, utils/, hooks/, types/, constants/
 *   6. Shared code goes to the Lowest Common Ancestor folder
 *   7. Assets are the ONLY exception - they can be loose files inside a component folder
 */
class StructureComputer {
  constructor(files, renderTree, dependencyGraph, srcPath) {
    this.files = files;
    this.renderTree = renderTree;
    this.dependencyGraph = dependencyGraph;
    this.srcPath = srcPath;
    
    this.fileMap = new Map();
    for (const file of files) {
      this.fileMap.set(file.filePath, file);
    }
  }

  compute() {
    const moves = [];
    const importUpdates = [];
    
    // Build the new directory structure based on render tree
    const newPaths = new Map();
    
    // Step 1: Identify root components AND hooks (both are first-class citizens)
    const roots = this.identifyRoots();
    
    // Step 2: Process components and hooks according to strict rules
    const atomicPaths = this.computeAtomicPaths(roots);
    
    // Step 3: Process support files (utils, types, etc.) - they MUST nest under their consumer
    const supportPaths = this.computeSupportFilePaths(atomicPaths);
    
    // Merge all paths
    for (const [filePath, newPath] of atomicPaths) {
      newPaths.set(filePath, newPath);
    }
    for (const [filePath, newPath] of supportPaths) {
      newPaths.set(filePath, newPath);
    }
    
    // Step 4: Detect and resolve collisions (multiple files -> same destination)
    this.resolveCollisions(newPaths);
    
    // Generate move operations
    for (const [oldPath, newPath] of newPaths) {
      if (oldPath !== newPath) {
        const relativeOld = path.relative(this.srcPath, oldPath);
        const relativeNew = path.relative(this.srcPath, newPath);
        
        moves.push({
          from: relativeOld,
          to: relativeNew,
          absoluteFrom: oldPath,
          absoluteTo: newPath,
        });
      }
    }

    // Generate import updates
    for (const file of this.files) {
      const updates = this.computeImportUpdates(file, newPaths);
      if (updates.length > 0) {
        importUpdates.push({
          file: path.relative(this.srcPath, newPaths.get(file.filePath) || file.filePath),
          changes: updates,
        });
      }
    }

    return { moves, importUpdates, newPaths };
  }

  resolveCollisions(newPaths) {
    // Find all destination paths that have multiple sources
    const destToSources = new Map();
    
    for (const [oldPath, newPath] of newPaths) {
      if (!destToSources.has(newPath)) {
        destToSources.set(newPath, []);
      }
      destToSources.get(newPath).push(oldPath);
    }
    
    // Resolve collisions by making names unique
    for (const [dest, sources] of destToSources) {
      if (sources.length <= 1) continue;
      
      for (const source of sources) {
        const originalRelative = path.relative(this.srcPath, source);
        const parts = originalRelative.split(path.sep);
        
        if (parts.length >= 2) {
          const parentDir = parts[parts.length - 2];
          const fileName = parts[parts.length - 1];
          const file = this.fileMap.get(source);
          const ext = file?.extension || path.extname(fileName);
          const baseName = path.basename(fileName, ext);
          
          // Create unique folder name: ParentBasename
          const uniqueName = this.toPascalCase(parentDir) + this.toPascalCase(baseName);
          const destDir = path.dirname(path.dirname(dest)); // Go up one level from index file
          const newDest = path.join(destDir, uniqueName, 'index' + ext);
          
          newPaths.set(source, newDest);
        } else {
          newPaths.set(source, source);
        }
      }
    }
  }

  toPascalCase(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  toCamelCase(str) {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  /**
   * Identify root-level atoms: ONLY components that have no parents in render tree.
   * Hooks are NOT roots - they nest inside the component that uses them.
   */
  identifyRoots() {
    const roots = [];
    
    // Root components: no parent in render tree OR are entry points
    const components = this.files.filter(f => f.classification === 'component');
    for (const comp of components) {
      const parents = this.renderTree.getParents(comp.filePath);
      const isEntryPoint = this.isEntryPoint(comp);
      if (parents.length === 0 || isEntryPoint) {
        roots.push(comp.filePath);
      }
    }

    return roots;
  }

  isEntryPoint(file) {
    const name = file.name.toLowerCase();
    const relativePath = path.relative(this.srcPath, file.filePath).toLowerCase();
    
    // Common entry point patterns
    const entryPatterns = [
      'app',
      'index',
      'main',
      'root',
      '_app', // Next.js
      '_document', // Next.js
      'layout', // Next.js app router
      'page', // Next.js app router
    ];

    // Check if file is in pages directory (Next.js)
    if (relativePath.includes('pages/') || relativePath.includes('app/')) {
      return true;
    }

    return entryPatterns.some(pattern => name.includes(pattern));
  }

  /**
   * STRICT RULE: Only components are first-class atoms.
   * Process the render tree to place components in their hierarchy.
   */
  computeAtomicPaths(roots) {
    const paths = new Map();
    const processed = new Set();
    
    // Process each root component and its descendants
    for (const root of roots) {
      this.processComponentTree(root, this.srcPath, paths, processed);
    }

    // Process any remaining components that weren't reached (orphans)
    const components = this.files.filter(f => f.classification === 'component');
    for (const comp of components) {
      if (!processed.has(comp.filePath)) {
        this.processComponentTree(comp.filePath, this.srcPath, paths, processed);
      }
    }

    return paths;
  }

  /**
   * Process a component and its child components recursively.
   * Each component becomes: parentDir/ComponentName/index.ext
   */
  processComponentTree(nodeId, parentDir, paths, processed) {
    if (processed.has(nodeId)) return;
    processed.add(nodeId);

    const file = this.fileMap.get(nodeId);
    if (!file || file.classification !== 'component') return;

    // Skip entry points like main.tsx - they stay as-is
    if (this.isSpecialEntryPoint(file)) {
      paths.set(nodeId, file.filePath);
      return;
    }

    // Component becomes: parentDir/ComponentName/index.ext
    const componentName = this.getComponentName(file);
    const newDir = path.join(parentDir, componentName);
    const newPath = path.join(newDir, 'index' + (file.extension || '.tsx'));
    
    paths.set(nodeId, newPath);

    // Process children from render tree
    const children = this.renderTree.getChildren(nodeId);
    for (const childId of children) {
      const childFile = this.fileMap.get(childId);
      if (!childFile || childFile.classification !== 'component') continue;

      const childParents = this.renderTree.getParents(childId);
      
      if (childParents.length === 1) {
        // Private child - nest inside this component's directory
        this.processComponentTree(childId, newDir, paths, processed);
      } else {
        // Shared component - place at LCA of all parents
        if (!processed.has(childId)) {
          const lca = this.findLCA(childParents, paths);
          this.processComponentTree(childId, lca, paths, processed);
        }
      }
    }
  }

  /**
   * Check if this is a special entry point that shouldn't be reorganized.
   */
  isSpecialEntryPoint(file) {
    const name = file.name.toLowerCase();
    return name === 'main' || name === 'index';
  }

  /**
   * Get PascalCase component name for directory.
   */
  getComponentName(file) {
    let name = file.name;
    
    // Handle index files - use parent directory name
    if (name === 'index') {
      const dir = path.dirname(file.filePath);
      name = path.basename(dir);
    }

    // Ensure PascalCase
    return this.toPascalCase(name);
  }

  findLCA(nodeIds, existingPaths) {
    if (nodeIds.length === 0) return this.srcPath;
    if (nodeIds.length === 1) {
      const existingPath = existingPaths.get(nodeIds[0]);
      return existingPath ? path.dirname(path.dirname(existingPath)) : this.srcPath;
    }

    // Get paths for all nodes
    const nodePaths = nodeIds.map(id => {
      const existing = existingPaths.get(id);
      if (existing) {
        return path.dirname(existing);
      }
      const file = this.fileMap.get(id);
      return file ? path.dirname(file.filePath) : this.srcPath;
    });

    // Find common ancestor
    const parts = nodePaths.map(p => path.relative(this.srcPath, p).split(path.sep));
    
    const commonParts = [];
    const minLength = Math.min(...parts.map(p => p.length));
    
    for (let i = 0; i < minLength; i++) {
      const current = parts[0][i];
      if (parts.every(p => p[i] === current)) {
        commonParts.push(current);
      } else {
        break;
      }
    }

    return path.join(this.srcPath, ...commonParts);
  }

  /**
   * STRICT RULE: All support files (hooks, utils, types, constants, etc.) MUST be nested
   * inside the folder of the component that imports them.
   * 
   * HOOKS are treated as support files - they nest inside their consuming component.
   * If multiple components import the same file, it goes to their LCA folder.
   * Support files also become folders with index files (no loose files).
   * 
   * This uses an iterative approach to handle dependencies between support files.
   */
  computeSupportFilePaths(atomicPaths) {
    const paths = new Map();
    
    // Support file classifications - everything that's not a component or special
    const supportFiles = this.files.filter(f => 
      f.classification !== 'component' && 
      f.classification !== 'barrel' &&
      f.classification !== 'test-setup' &&
      f.classification !== 'root-config'
    );

    // Build a combined lookup that includes both atomic paths and support paths
    const allPaths = new Map(atomicPaths);
    
    // Process in multiple passes until all files are placed
    let remaining = [...supportFiles];
    let maxIterations = 10; // Prevent infinite loops
    
    while (remaining.length > 0 && maxIterations > 0) {
      maxIterations--;
      const stillRemaining = [];
      
      for (const file of remaining) {
        // Skip special entry points entirely - they stay as-is
        if (this.isSpecialEntryPoint(file)) {
          paths.set(file.filePath, file.filePath);
          allPaths.set(file.filePath, file.filePath);
          continue;
        }

        const importers = this.dependencyGraph.getParents(file.filePath);
        
        // Check if all importers are resolved
        const allImportersResolved = importers.every(imp => allPaths.has(imp));
        
        if (importers.length > 0 && !allImportersResolved) {
          // Wait for importers to be resolved first
          stillRemaining.push(file);
          continue;
        }
        
        // Find the target directory based on importers
        let targetDir;
        
        if (importers.length === 0) {
          // Orphaned file - stays at src root but still becomes a folder
          targetDir = this.srcPath;
        } else if (importers.length === 1) {
          // Single importer - nest inside that importer's folder
          const importerPath = allPaths.get(importers[0]) || importers[0];
          targetDir = path.dirname(importerPath);
        } else {
          // Multiple importers - find LCA using resolved paths
          targetDir = this.findLCAWithPaths(importers, allPaths);
        }

        // Compute the new path based on file type
        let newPath;
        
        if (file.classification === 'asset') {
          // Assets are the ONE exception - they can be loose files
          newPath = path.join(targetDir, file.name + file.extension);
        } else if (file.classification === 'test') {
          // Tests sit next to their source
          const sourceFile = this.findTestSourceFile(file);
          if (sourceFile) {
            const sourcePath = allPaths.get(sourceFile.filePath) || sourceFile.filePath;
            const sourceDir = path.dirname(sourcePath);
            newPath = path.join(sourceDir, file.name + file.extension);
          } else {
            // No matching source - keep at src root as loose file
            newPath = file.filePath;
          }
        } else if (file.classification === 'hook') {
          // Hooks become folders with index files
          const folderName = this.getHookFolderName(file);
          newPath = path.join(targetDir, folderName, 'index' + file.extension);
        } else {
          // All other support files become folders with index files
          const folderName = this.getSupportFolderName(file);
          newPath = path.join(targetDir, folderName, 'index' + file.extension);
        }
        
        paths.set(file.filePath, newPath);
        allPaths.set(file.filePath, newPath);
      }
      
      // If we made no progress, break to avoid infinite loop
      if (stillRemaining.length === remaining.length) {
        // Place remaining files at src root as fallback
        for (const file of stillRemaining) {
          if (this.isSpecialEntryPoint(file)) {
            paths.set(file.filePath, file.filePath);
          } else if (file.classification === 'asset') {
            paths.set(file.filePath, path.join(this.srcPath, file.name + file.extension));
          } else {
            const folderName = file.classification === 'hook' 
              ? this.getHookFolderName(file) 
              : this.getSupportFolderName(file);
            paths.set(file.filePath, path.join(this.srcPath, folderName, 'index' + file.extension));
          }
        }
        break;
      }
      
      remaining = stillRemaining;
    }

    // Handle barrel files - mark for removal (they'll be regenerated)
    const barrelFiles = this.files.filter(f => f.classification === 'barrel');
    for (const barrel of barrelFiles) {
      paths.set(barrel.filePath, barrel.filePath);
    }

    // Handle root-config files - never move them
    const rootConfigFiles = this.files.filter(f => f.classification === 'root-config');
    for (const config of rootConfigFiles) {
      paths.set(config.filePath, config.filePath);
    }

    return paths;
  }

  /**
   * Find LCA using already-resolved paths.
   */
  findLCAWithPaths(nodeIds, resolvedPaths) {
    if (nodeIds.length === 0) return this.srcPath;
    if (nodeIds.length === 1) {
      const existingPath = resolvedPaths.get(nodeIds[0]);
      return existingPath ? path.dirname(existingPath) : this.srcPath;
    }

    // Get resolved paths for all nodes
    const nodePaths = nodeIds.map(id => {
      const resolved = resolvedPaths.get(id);
      if (resolved) {
        return path.dirname(resolved);
      }
      return path.dirname(id);
    });

    // Find common ancestor
    const parts = nodePaths.map(p => path.relative(this.srcPath, p).split(path.sep));
    
    const commonParts = [];
    const minLength = Math.min(...parts.map(p => p.length));
    
    for (let i = 0; i < minLength; i++) {
      const current = parts[0][i];
      if (parts.every(p => p[i] === current)) {
        commonParts.push(current);
      } else {
        break;
      }
    }

    return path.join(this.srcPath, ...commonParts);
  }

  /**
   * Get folder name for hooks - preserves useXxx naming.
   */
  getHookFolderName(file) {
    let name = file.name;
    
    if (name === 'index') {
      const dir = path.dirname(file.filePath);
      name = path.basename(dir);
    }
    
    // Ensure it starts with 'use'
    return name.startsWith('use') ? name : 'use' + this.toPascalCase(name);
  }

  /**
   * Get folder name for support files.
   * Preserves the original casing intent while ensuring valid folder names.
   */
  getSupportFolderName(file) {
    let name = file.name;
    
    // Handle index files
    if (name === 'index') {
      const dir = path.dirname(file.filePath);
      name = path.basename(dir);
    }
    
    // Types get a lowercase 'types' prefix if not already there
    if (file.classification === 'type' && !name.toLowerCase().includes('type')) {
      return name + 'Types';
    }
    
    return name;
  }

  findTestSourceFile(testFile) {
    // Extract source file name from test file name
    // e.g., Button.test.tsx -> Button, useAuth.spec.ts -> useAuth
    const testName = testFile.name
      .replace(/\.test$/, '')
      .replace(/\.spec$/, '');
    
    // Look for matching source file
    for (const file of this.files) {
      if (file.classification === 'test' || file.classification === 'test-setup') continue;
      
      // Match by name (case-insensitive for flexibility)
      if (file.name.toLowerCase() === testName.toLowerCase()) {
        return file;
      }
    }
    
    // Also check imports from the test file - what does it import?
    if (testFile.imports) {
      for (const imp of testFile.imports) {
        if (imp.resolvedPath) {
          const importedFile = this.fileMap.get(imp.resolvedPath);
          if (importedFile && 
              importedFile.classification !== 'test' &&
              importedFile.classification !== 'barrel') {
            // Check if the imported file name matches
            if (importedFile.name.toLowerCase().includes(testName.toLowerCase())) {
              return importedFile;
            }
          }
        }
      }
    }
    
    return null;
  }

  computeImportUpdates(file, newPaths) {
    const updates = [];
    const fileNewPath = newPaths.get(file.filePath) || file.filePath;
    const fileNewDir = path.dirname(fileNewPath);

    for (const imp of file.imports) {
      if (!imp.resolvedPath || imp.isPackage) continue;

      const importNewPath = newPaths.get(imp.resolvedPath);
      if (!importNewPath || importNewPath === imp.resolvedPath) continue;

      // Calculate new relative import
      let newRelative = path.relative(fileNewDir, importNewPath);
      
      // Remove extension and /index suffix
      newRelative = newRelative
        .replace(/\.(tsx?|jsx?)$/, '')
        .replace(/\/index$/, '');

      // Ensure it starts with ./
      if (!newRelative.startsWith('.')) {
        newRelative = './' + newRelative;
      }

      if (newRelative !== imp.source) {
        updates.push({
          from: imp.source,
          to: newRelative,
        });
      }
    }

    return updates;
  }
}

module.exports = StructureComputer;
