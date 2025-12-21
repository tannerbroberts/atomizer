const path = require('path');

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
    
    // Step 1: Identify root components (entry points)
    const roots = this.identifyRoots();
    
    // Step 2: Process components according to rules
    const componentPaths = this.computeComponentPaths(roots);
    
    // Step 3: Process non-components based on dependency graph
    const nonComponentPaths = this.computeNonComponentPaths(componentPaths);
    
    // Merge all paths
    for (const [filePath, newPath] of componentPaths) {
      newPaths.set(filePath, newPath);
    }
    for (const [filePath, newPath] of nonComponentPaths) {
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
    
    // Resolve collisions
    for (const [dest, sources] of destToSources) {
      if (sources.length <= 1) continue;
      
      // Multiple files are trying to move to the same location
      // Resolution: keep them in their original relative structure from a common ancestor
      for (const source of sources) {
        // Get the original relative path from srcPath
        const originalRelative = path.relative(this.srcPath, source);
        const parts = originalRelative.split(path.sep);
        
        // If the file is in a subdirectory, include the parent dir in the name
        // e.g., mutations/cart.ts → mutations-cart.ts, queries/cart.ts → queries-cart.ts
        if (parts.length >= 2) {
          const parentDir = parts[parts.length - 2];
          const fileName = parts[parts.length - 1];
          const file = this.fileMap.get(source);
          const ext = file?.extension || path.extname(fileName);
          const baseName = path.basename(fileName, ext);
          
          // Create a unique name: parent-basename
          const uniqueName = `${parentDir}-${baseName}`;
          const destDir = path.dirname(dest);
          const newDest = path.join(destDir, uniqueName + ext);
          
          newPaths.set(source, newDest);
        } else {
          // File at root - keep it in place to avoid collision
          newPaths.set(source, source);
        }
      }
    }
  }

  identifyRoots() {
    const roots = [];
    const components = this.files.filter(f => f.classification === 'component');
    
    for (const comp of components) {
      const parents = this.renderTree.getParents(comp.filePath);
      
      // Check if it's an entry point
      const isEntryPoint = this.isEntryPoint(comp);
      
      // No parents in render tree = root component
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

  computeComponentPaths(roots) {
    const paths = new Map();
    const processed = new Set();
    
    // Process each root and its descendants
    for (const root of roots) {
      this.processComponentTree(root, this.srcPath, paths, processed);
    }

    // Process any remaining components that weren't reached
    const components = this.files.filter(f => f.classification === 'component');
    for (const comp of components) {
      if (!processed.has(comp.filePath)) {
        this.processComponentTree(comp.filePath, this.srcPath, paths, processed);
      }
    }

    return paths;
  }

  processComponentTree(nodeId, parentDir, paths, processed) {
    if (processed.has(nodeId)) return;
    processed.add(nodeId);

    const file = this.fileMap.get(nodeId);
    if (!file) return;

    // Rule 1: Component Atomicity - every component becomes a directory
    const componentName = this.getComponentName(file);
    const newDir = path.join(parentDir, componentName);
    const newPath = path.join(newDir, 'index' + (file.extension || '.tsx'));
    
    paths.set(nodeId, newPath);

    // Get children in render tree
    const children = this.renderTree.getChildren(nodeId);

    for (const childId of children) {
      const childFile = this.fileMap.get(childId);
      if (!childFile) continue;

      // Check if child is rendered only by this component (Rule 2)
      // or by multiple components (Rule 3)
      const childParents = this.renderTree.getParents(childId);
      
      if (childParents.length === 1) {
        // Rule 2: Private child - nest inside parent's directory
        this.processComponentTree(childId, newDir, paths, processed);
      } else {
        // Rule 3: Shared component - will be handled by LCA computation
        // For now, mark it for later processing
        if (!processed.has(childId)) {
          const lca = this.findLCA(childParents, paths);
          const sharedDir = path.join(lca, '_components');
          this.processComponentTree(childId, sharedDir, paths, processed);
        }
      }
    }
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

  computeNonComponentPaths(componentPaths) {
    const paths = new Map();
    const nonComponents = this.files.filter(f => 
      f.classification !== 'component' && 
      f.classification !== 'asset' &&
      f.classification !== 'test' &&
      f.classification !== 'barrel' &&
      f.classification !== 'test-setup' &&
      f.classification !== 'root-config'
    );

    for (const file of nonComponents) {
      // Find who imports this file
      const importers = this.dependencyGraph.getParents(file.filePath);
      
      if (importers.length === 0) {
        // Orphaned file - keep in root
        paths.set(file.filePath, file.filePath);
        continue;
      }

      if (importers.length === 1) {
        // Rule 4: Private - collocate with the single importer
        const importerPath = componentPaths.get(importers[0]) || importers[0];
        const importerDir = path.dirname(importerPath);
        const subDir = this.getSubdirectory(file.classification);
        const newPath = path.join(importerDir, subDir, file.name + file.extension);
        paths.set(file.filePath, newPath);
      } else {
        // Rule 4: Shared - move to LCA
        const lca = this.findLCA(importers, componentPaths);
        const subDir = this.getSubdirectory(file.classification);
        const newPath = path.join(lca, subDir, file.name + file.extension);
        paths.set(file.filePath, newPath);
      }
    }

    // Handle test files - they follow their source file
    const testFiles = this.files.filter(f => f.classification === 'test');
    for (const testFile of testFiles) {
      const sourceFile = this.findTestSourceFile(testFile);
      if (sourceFile) {
        const sourcePath = componentPaths.get(sourceFile.filePath) || 
                           paths.get(sourceFile.filePath) || 
                           sourceFile.filePath;
        const sourceDir = path.dirname(sourcePath);
        const newPath = path.join(sourceDir, testFile.name + testFile.extension);
        paths.set(testFile.filePath, newPath);
      } else {
        // No matching source - keep in place
        paths.set(testFile.filePath, testFile.filePath);
      }
    }

    // Handle test-setup files - keep in src root
    const testSetupFiles = this.files.filter(f => f.classification === 'test-setup');
    for (const setupFile of testSetupFiles) {
      paths.set(setupFile.filePath, setupFile.filePath);
    }

    // Handle barrel files - we'll regenerate them, so mark for removal
    // The barrel file content will be regenerated by the Migrator
    const barrelFiles = this.files.filter(f => f.classification === 'barrel');
    for (const barrel of barrelFiles) {
      // Keep barrel files in place but mark for regeneration
      paths.set(barrel.filePath, barrel.filePath);
    }

    // Handle assets
    const assets = this.files.filter(f => f.classification === 'asset');
    for (const asset of assets) {
      const importers = this.dependencyGraph.getParents(asset.filePath);
      
      if (importers.length <= 1) {
        const importerPath = importers[0] ? 
          (componentPaths.get(importers[0]) || importers[0]) : 
          this.srcPath;
        const importerDir = importers[0] ? path.dirname(importerPath) : this.srcPath;
        const newPath = path.join(importerDir, 'assets', asset.name + asset.extension);
        paths.set(asset.filePath, newPath);
      } else {
        const lca = this.findLCA(importers, componentPaths);
        const newPath = path.join(lca, 'assets', asset.name + asset.extension);
        paths.set(asset.filePath, newPath);
      }
    }

    // Handle root-config files - never move them
    const rootConfigFiles = this.files.filter(f => f.classification === 'root-config');
    for (const config of rootConfigFiles) {
      paths.set(config.filePath, config.filePath);
    }

    return paths;
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

  getSubdirectory(classification) {
    const dirs = {
      'hook': 'hooks',
      'util': 'utils',
      'constant': 'constants',
      'type': 'types',
      'context': 'contexts',
      'style': 'styles',
      'barrel': '',
      'module': 'lib',
    };
    return dirs[classification] || 'lib';
  }

  getComponentName(file) {
    // Use PascalCase for component directories
    let name = file.name;
    
    // Handle index files - use parent directory name
    if (name === 'index') {
      const dir = path.dirname(file.filePath);
      name = path.basename(dir);
    }

    // Ensure PascalCase
    return name.charAt(0).toUpperCase() + name.slice(1);
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
