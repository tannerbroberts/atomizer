const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * Migrator - Restructures components and hooks based on atom rules
 * 
 * Uses traced dependency data from DependencyTracer to:
 * 1. Determine the new file structure based on component/hook hierarchy
 * 2. Compute which files need to move where
 * 3. Update all imports to reflect the new structure
 * 
 * ATOM RULES:
 * - Components are first-class atoms, each gets its own folder with index file
 * - Hooks nest inside the component that uses them (single consumer) or at LCA (multiple consumers)
 * - The file structure reflects the render tree / dependency hierarchy
 * - No loose files - everything becomes FolderName/index.ext
 */
class Migrator {
  constructor(srcPath, outputPath, tracer) {
    this.srcPath = path.resolve(srcPath);
    this.outputPath = path.resolve(outputPath);
    this.tracer = tracer;
    this.indexer = tracer.indexer;
    
    // Build lookup maps from traced data
    this.fileToNodes = this.buildFileToNodesMap();
    this.fileToImports = this.buildFileToImportsMap();
    this.nodeClassifications = this.classifyAllNodes();
  }

  /**
   * Build map of filePath -> array of node UUIDs
   */
  buildFileToNodesMap() {
    const map = new Map();
    for (const [uuid, node] of this.indexer.project) {
      const filePath = node.filePath;
      if (!map.has(filePath)) {
        map.set(filePath, []);
      }
      map.get(filePath).push(uuid);
    }
    return map;
  }

  /**
   * Build map of filePath -> array of import info
   */
  buildFileToImportsMap() {
    const map = new Map();
    for (const [uuid, node] of this.indexer.imports) {
      const filePath = node.filePath;
      if (!map.has(filePath)) {
        map.set(filePath, []);
      }
      map.get(filePath).push({
        uuid,
        source: node.importSource,
        resolvedPath: this.indexer.resolveModulePath(node.importSource, path.dirname(filePath)),
        specifiers: node.importedNames || [],
      });
    }
    return map;
  }

  /**
   * Classify all nodes as component, hook, or support
   * Uses heuristics based on naming and JSX usage
   */
  classifyAllNodes() {
    const classifications = new Map();
    
    for (const [uuid, node] of this.indexer.declarations) {
      const names = node.declaredNames || [];
      const raw = node.raw || '';
      
      let classification = 'support';
      
      for (const name of names) {
        // Hooks start with 'use' followed by uppercase
        if (/^use[A-Z]/.test(name)) {
          classification = 'hook';
          break;
        }
        // Components are PascalCase and contain JSX or return JSX
        if (/^[A-Z]/.test(name) && this.containsJSX(raw)) {
          classification = 'component';
          break;
        }
      }
      
      classifications.set(uuid, {
        uuid,
        node,
        classification,
        name: names[0] || 'anonymous',
        filePath: node.filePath,
      });
    }
    
    return classifications;
  }

  /**
   * Check if code contains JSX elements
   */
  containsJSX(code) {
    // Look for JSX patterns: <Component, </tag, />
    return /<[A-Z][a-zA-Z]*/.test(code) || /<\/[a-z]/.test(code) || /\/>/.test(code);
  }

  /**
   * Execute the migration based on traced dependencies
   */
  async execute() {
    console.log(chalk.blue('\n📦 Executing migration based on traced dependencies...\n'));

    // Step 1: Compute new paths for all files based on atom rules
    console.log(chalk.yellow('Step 1: Computing atomic structure...'));
    const newPaths = this.computeAtomicStructure();
    console.log(chalk.green(`   ✓ Computed paths for ${newPaths.size} files\n`));

    // Step 2: Compute import rewrites based on path changes
    console.log(chalk.yellow('Step 2: Computing import rewrites...'));
    const importRewrites = this.computeImportRewrites(newPaths);
    console.log(chalk.green(`   ✓ Computed rewrites for ${importRewrites.size} files\n`));

    // Step 3: Create output directories
    console.log(chalk.yellow('Step 3: Creating directory structure...'));
    await this.ensureDir(this.outputPath);
    const directories = new Set();
    for (const [, newPath] of newPaths) {
      directories.add(path.dirname(newPath));
    }
    for (const dir of directories) {
      const targetDir = dir.replace(this.srcPath, this.outputPath);
      await this.ensureDir(targetDir);
    }
    console.log(chalk.green(`   ✓ Created ${directories.size} directories\n`));

    // Step 4: Copy files with updated imports
    console.log(chalk.yellow('Step 4: Copying files and updating imports...'));
    let copiedCount = 0;
    for (const [oldPath, newPath] of newPaths) {
      if (!fs.existsSync(oldPath)) continue;
      
      const targetPath = newPath.replace(this.srcPath, this.outputPath);
      const rewrites = importRewrites.get(oldPath) || [];
      await this.copyFileWithImportUpdates(oldPath, targetPath, rewrites);
      
      if (oldPath !== newPath) {
        const relativeOld = path.relative(this.srcPath, oldPath);
        const relativeNew = path.relative(this.srcPath, newPath);
        console.log(chalk.gray(`  ${relativeOld} → ${relativeNew}`));
      }
      copiedCount++;
    }
    console.log(chalk.green(`\n✓ Migration complete! Copied ${copiedCount} files to ${this.outputPath}`));

    return { newPaths, importRewrites };
  }

  /**
   * Compute the atomic structure based on traced dependencies
   * 
   * ATOM RULES:
   * 1. Components become ComponentName/index.ext
   * 2. Single-consumer hooks nest inside their consumer's folder
   * 3. Multi-consumer hooks go to the LCA of their consumers
   * 4. Support files follow the same LCA rules
   */
  computeAtomicStructure() {
    const newPaths = new Map();
    const traced = this.tracer.traceAll();
    
    // Get all unique file paths
    const allFiles = new Set();
    for (const [, node] of this.indexer.project) {
      allFiles.add(node.filePath);
    }

    // First pass: identify and place components
    const componentFolders = new Map(); // filePath -> new folder path
    for (const [uuid, info] of this.nodeClassifications) {
      if (info.classification === 'component' && info.node.isExported) {
        const folderName = this.toPascalCase(info.name);
        const ext = path.extname(info.filePath);
        const newPath = path.join(this.srcPath, folderName, 'index' + ext);
        componentFolders.set(info.filePath, path.join(this.srcPath, folderName));
        newPaths.set(info.filePath, newPath);
      }
    }

    // Second pass: place hooks and support files based on their consumers
    for (const [uuid, tracedNode] of traced) {
      const info = this.nodeClassifications.get(uuid);
      if (!info) continue;
      if (info.classification === 'component') continue; // Already handled
      if (newPaths.has(info.filePath)) continue; // Already placed
      
      // Get all external consumers of this declaration
      const externalConsumers = Object.keys(tracedNode.dependant?.external || {});
      
      // Map consumer UUIDs to file paths
      const consumerFilePaths = new Set();
      for (const consumerUuid of externalConsumers) {
        const consumerNode = this.indexer.project.get(consumerUuid);
        if (consumerNode && consumerNode.filePath !== info.filePath) {
          consumerFilePaths.add(consumerNode.filePath);
        }
      }

      // Determine target folder based on consumers
      let targetDir;
      const consumers = Array.from(consumerFilePaths);
      
      if (consumers.length === 0) {
        // Orphaned - keep at src root
        targetDir = this.srcPath;
      } else if (consumers.length === 1) {
        // Single consumer - nest inside consumer's folder
        const consumerNewPath = newPaths.get(consumers[0]) || consumers[0];
        targetDir = path.dirname(consumerNewPath);
      } else {
        // Multiple consumers - find LCA
        targetDir = this.findLCA(consumers, newPaths);
      }

      // Create the new path
      const folderName = info.classification === 'hook' 
        ? info.name  // Hooks keep their useXxx naming
        : this.toCamelCase(info.name);
      const ext = path.extname(info.filePath);
      const newPath = path.join(targetDir, folderName, 'index' + ext);
      newPaths.set(info.filePath, newPath);
    }

    // Handle any remaining files (those without traced declarations)
    for (const filePath of allFiles) {
      if (!newPaths.has(filePath)) {
        // Keep file in place but convert to folder/index structure
        const baseName = path.basename(filePath, path.extname(filePath));
        const ext = path.extname(filePath);
        
        // Skip if already an index file
        if (baseName === 'index') {
          newPaths.set(filePath, filePath);
        } else {
          const dir = path.dirname(filePath);
          const newPath = path.join(dir, baseName, 'index' + ext);
          newPaths.set(filePath, newPath);
        }
      }
    }

    return newPaths;
  }

  /**
   * Find the Lowest Common Ancestor directory for multiple file paths
   */
  findLCA(filePaths, resolvedPaths) {
    if (filePaths.length === 0) return this.srcPath;
    if (filePaths.length === 1) {
      const resolved = resolvedPaths.get(filePaths[0]) || filePaths[0];
      return path.dirname(resolved);
    }

    // Get the directory paths relative to srcPath
    const relativeDirs = filePaths.map(fp => {
      const resolved = resolvedPaths.get(fp) || fp;
      return path.relative(this.srcPath, path.dirname(resolved)).split(path.sep);
    });

    // Find common prefix
    const commonParts = [];
    const minLen = Math.min(...relativeDirs.map(d => d.length));
    
    for (let i = 0; i < minLen; i++) {
      const part = relativeDirs[0][i];
      if (relativeDirs.every(d => d[i] === part)) {
        commonParts.push(part);
      } else {
        break;
      }
    }

    return path.join(this.srcPath, ...commonParts);
  }

  /**
   * Compute all import rewrites based on file moves
   */
  computeImportRewrites(newPaths) {
    const rewrites = new Map();

    for (const [filePath, imports] of this.fileToImports) {
      const fileRewrites = [];
      const fileNewPath = newPaths.get(filePath) || filePath;
      const fileNewDir = path.dirname(fileNewPath);
      const fileIsMoved = filePath !== fileNewPath;

      for (const imp of imports) {
        // Skip package imports (no resolved path or external package)
        if (!imp.resolvedPath) continue;
        if (!imp.resolvedPath.startsWith(this.srcPath)) continue;

        const targetNewPath = newPaths.get(imp.resolvedPath) || imp.resolvedPath;
        const targetIsMoved = imp.resolvedPath !== targetNewPath;

        // Skip if neither moved
        if (!fileIsMoved && !targetIsMoved) continue;

        // Calculate new relative import path
        let newRelative = path.relative(fileNewDir, targetNewPath);
        
        // Remove extension and /index suffix
        newRelative = newRelative.replace(/\.(tsx?|jsx?)$/, '');
        newRelative = newRelative.replace(/\/index$/, '');

        // Handle same-directory
        if (newRelative === '' || newRelative === 'index') {
          newRelative = '.';
        }

        // Ensure starts with ./
        if (!newRelative.startsWith('.') && !newRelative.startsWith('/')) {
          newRelative = './' + newRelative;
        }

        if (imp.source !== newRelative) {
          fileRewrites.push({
            from: imp.source,
            to: newRelative,
          });
        }
      }

      if (fileRewrites.length > 0) {
        rewrites.set(filePath, fileRewrites);
      }
    }

    return rewrites;
  }

  /**
   * Copy a file and apply import rewrites
   */
  async copyFileWithImportUpdates(fromPath, toPath, rewrites) {
    await this.ensureDir(path.dirname(toPath));
    
    let content = fs.readFileSync(fromPath, 'utf-8');
    
    for (const rewrite of rewrites) {
      content = this.rewriteImport(content, rewrite.from, rewrite.to);
    }
    
    fs.writeFileSync(toPath, content, 'utf-8');
  }

  /**
   * Rewrite an import path in file content
   */
  rewriteImport(content, from, to) {
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    const patterns = [
      new RegExp(`(from\\s+['"])${escaped}(['"])`, 'g'),
      new RegExp(`(require\\s*\\(\\s*['"])${escaped}(['"]\\s*\\))`, 'g'),
      new RegExp(`(import\\s*\\(\\s*['"])${escaped}(['"]\\s*\\))`, 'g'),
      new RegExp(`(export\\s+[^;]+\\s+from\\s+['"])${escaped}(['"])`, 'g'),
    ];
    
    for (const pattern of patterns) {
      content = content.replace(pattern, `$1${to}$2`);
    }
    
    return content;
  }

  /**
   * Ensure directory exists
   */
  async ensureDir(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  toPascalCase(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  toCamelCase(str) {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }
}

module.exports = Migrator;
