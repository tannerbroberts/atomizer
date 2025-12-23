const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class Migrator {
  constructor(srcPath, outputPath, files) {
    this.srcPath = srcPath;
    this.outputPath = outputPath;
    this.files = files || [];
    
    // Build a file map for quick lookup
    this.fileMap = new Map();
    for (const file of this.files) {
      this.fileMap.set(file.filePath, file);
    }
  }

  async execute(structure) {
    const { moves, importUpdates, newPaths } = structure;

    console.log(chalk.blue('\n📦 Executing migration...\n'));

    // Create output directory structure
    console.log(chalk.yellow('Creating output directory structure...'));
    await this.ensureDir(this.outputPath);

    try {
      // Step 1: Compute all import rewrites BEFORE copying anything
      console.log(chalk.yellow('Computing import rewrites...'));
      const importRewrites = this.computeAllImportRewrites(newPaths);

      // Step 2: Create all new directories in the output path
      console.log(chalk.yellow('Creating directories...'));
      const directories = new Set();
      for (const move of moves) {
        directories.add(path.dirname(move.absoluteTo));
      }
      
      for (const dir of directories) {
        const targetDir = dir.replace(this.srcPath, this.outputPath);
        await this.ensureDir(targetDir);
      }

      // Step 3: Copy files and update imports in one pass
      console.log(chalk.yellow('Copying files and updating imports...'));
      for (const [oldPath, newPath] of newPaths) {
        if (!fs.existsSync(oldPath)) continue;
        
        const targetPath = newPath.replace(this.srcPath, this.outputPath);
        const rewrites = importRewrites.get(oldPath) || [];
        await this.copyFileWithImportUpdates(oldPath, targetPath, rewrites);
        
        const relativeOld = path.relative(this.srcPath, oldPath);
        const relativeNew = path.relative(this.srcPath, newPath);
        console.log(chalk.gray(`  ${relativeOld} → ${relativeNew}`));
      }

      // Step 4: Handle files that didn't move but need import updates
      for (const file of this.files) {
        const newPath = newPaths.get(file.filePath) || file.filePath;
        if (newPath === file.filePath) {
          const targetPath = file.filePath.replace(this.srcPath, this.outputPath);
          const rewrites = importRewrites.get(file.filePath) || [];
          
          // If it's not already copied (e.g. it didn't move), copy it now
          if (!fs.existsSync(targetPath) && fs.existsSync(file.filePath)) {
            await this.copyFileWithImportUpdates(file.filePath, targetPath, rewrites);
            if (rewrites.length > 0) {
              console.log(chalk.gray(`  Updated imports in ${path.relative(this.srcPath, file.filePath)}`));
            }
          }
        }
      }

      console.log(chalk.green('\n✓ Migration complete!'));

    } catch (error) {
      console.error(chalk.red('\n✗ Migration failed:'), error.message);
      throw error;
    }
  }

  computeAllImportRewrites(newPaths) {
    const rewrites = new Map();
    
    for (const file of this.files) {
      if (!file.imports || file.imports.length === 0) continue;
      
      const fileRewrites = [];
      const fileNewPath = newPaths.get(file.filePath) || file.filePath;
      const fileNewDir = path.dirname(fileNewPath);
      const fileOldDir = path.dirname(file.filePath);
      const fileIsMoved = file.filePath !== fileNewPath;
      
      for (const imp of file.imports) {
        // Skip package imports
        if (imp.isPackage) continue;
        if (!imp.resolvedPath) continue;
        
        // Get where this import target is being copied to
        // If not in newPaths, it stays in its original location
        const targetNewPath = newPaths.get(imp.resolvedPath) || imp.resolvedPath;
        const targetIsMoved = imp.resolvedPath !== targetNewPath;
        
        // Skip if neither file moved - no rewrite needed
        if (!fileIsMoved && !targetIsMoved) continue;
        
        // Calculate the new relative import path from new source to new target
        let newRelative = path.relative(fileNewDir, targetNewPath);
        
        // Remove extension
        newRelative = newRelative.replace(/\.(tsx?|jsx?)$/, '');
        
        // Remove /index suffix (we can import directories)
        newRelative = newRelative.replace(/\/index$/, '');
        
        // Handle same-directory imports
        if (newRelative === '' || newRelative === 'index') {
          // The imported file is becoming this directory's index
          // This shouldn't happen often, but handle it
          newRelative = '.';
        }
        
        // Ensure it starts with ./
        if (!newRelative.startsWith('.') && !newRelative.startsWith('/')) {
          newRelative = './' + newRelative;
        }
        
        // Check if the import actually needs to change
        if (imp.source !== newRelative) {
          fileRewrites.push({
            from: imp.source,
            to: newRelative,
          });
        }
      }
      
      if (fileRewrites.length > 0) {
        rewrites.set(file.filePath, fileRewrites);
      }
    }
    
    return rewrites;
  }

  async copyFileWithImportUpdates(fromPath, toPath, rewrites) {
    await this.ensureDir(path.dirname(toPath));
    
    // Read content
    let content = fs.readFileSync(fromPath, 'utf-8');
    
    // Apply import rewrites
    for (const rewrite of rewrites) {
      content = this.rewriteImport(content, rewrite.from, rewrite.to);
    }
    
    // Write to new location
    fs.writeFileSync(toPath, content, 'utf-8');
  }

  async updateFileImports(filePath, rewrites) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    for (const rewrite of rewrites) {
      content = this.rewriteImport(content, rewrite.from, rewrite.to);
    }
    
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  rewriteImport(content, from, to) {
    // Escape special regex characters in the import path
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Match various import patterns
    const patterns = [
      // import ... from 'path'
      new RegExp(`(from\\s+['"])${escaped}(['"])`, 'g'),
      // require('path')
      new RegExp(`(require\\s*\\(\\s*['"])${escaped}(['"]\\s*\\))`, 'g'),
      // import('path')
      new RegExp(`(import\\s*\\(\\s*['"])${escaped}(['"]\\s*\\))`, 'g'),
      // export ... from 'path'
      new RegExp(`(export\\s+[^;]+\\s+from\\s+['"])${escaped}(['"])`, 'g'),
    ];
    
    for (const pattern of patterns) {
      content = content.replace(pattern, `$1${to}$2`);
    }
    
    return content;
  }

  async ensureDir(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

module.exports = Migrator;
