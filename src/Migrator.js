const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class Migrator {
  constructor(srcPath, outputPath, files) {
    this.srcPath = srcPath;
    this.outputPath = outputPath;
    this.isInPlace = srcPath === outputPath;
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

    // If output is different from source, copy all files first
    if (!this.isInPlace) {
      console.log(chalk.yellow('Creating output directory structure...'));
      await this.copyToOutput();
    }

    // Create backup
    if (this.isInPlace) {
      console.log(chalk.yellow('Creating backup...'));
      await this.createBackup();
    }

    try {
      // Step 1: Compute all import rewrites BEFORE moving anything
      console.log(chalk.yellow('Computing import rewrites...'));
      const importRewrites = this.computeAllImportRewrites(newPaths);

      // Step 2: Create all new directories
      console.log(chalk.yellow('Creating directories...'));
      const directories = new Set();
      for (const move of moves) {
        directories.add(path.dirname(move.absoluteTo));
      }
      
      for (const dir of directories) {
        const targetDir = this.isInPlace ? dir : dir.replace(this.srcPath, this.outputPath);
        await this.ensureDir(targetDir);
      }

      // Step 3: Copy/move files and update imports in one pass
      console.log(chalk.yellow('Moving files and updating imports...'));
      for (const [oldPath, newPath] of newPaths) {
        if (!fs.existsSync(oldPath)) continue;
        
        const rewrites = importRewrites.get(oldPath) || [];
        await this.moveFileWithImportUpdates(oldPath, newPath, rewrites);
        
        if (oldPath !== newPath) {
          const relativeOld = path.relative(this.srcPath, oldPath);
          const relativeNew = path.relative(this.srcPath, newPath);
          console.log(chalk.gray(`  ${relativeOld} → ${relativeNew}`));
        }
      }

      // Step 4: Handle files that didn't move but need import updates
      for (const file of this.files) {
        const newPath = newPaths.get(file.filePath) || file.filePath;
        if (newPath === file.filePath) {
          const rewrites = importRewrites.get(file.filePath) || [];
          if (rewrites.length > 0 && fs.existsSync(file.filePath)) {
            await this.updateFileImports(file.filePath, rewrites);
            console.log(chalk.gray(`  Updated imports in ${path.relative(this.srcPath, file.filePath)}`));
          }
        }
      }

      // Step 5: Clean up empty directories (if in-place)
      if (this.isInPlace) {
        console.log(chalk.yellow('Cleaning up empty directories...'));
        await this.cleanupEmptyDirs(this.srcPath);
      }

      console.log(chalk.green('\n✓ Migration complete!'));

    } catch (error) {
      console.error(chalk.red('\n✗ Migration failed:'), error.message);
      
      if (this.isInPlace) {
        console.log(chalk.yellow('Restoring from backup...'));
        await this.restoreBackup();
      }
      
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
        
        // Get where this import target is moving to
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

  async moveFileWithImportUpdates(fromPath, toPath, rewrites) {
    await this.ensureDir(path.dirname(toPath));
    
    // Read content
    let content = fs.readFileSync(fromPath, 'utf-8');
    
    // Apply import rewrites
    for (const rewrite of rewrites) {
      content = this.rewriteImport(content, rewrite.from, rewrite.to);
    }
    
    // Write to new location
    fs.writeFileSync(toPath, content, 'utf-8');
    
    // Remove old file (if in-place and paths are different)
    if (this.isInPlace && fromPath !== toPath) {
      fs.unlinkSync(fromPath);
    }
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

  async moveFile(from, to) {
    await this.ensureDir(path.dirname(to));
    
    // Read content
    const content = fs.readFileSync(from, 'utf-8');
    
    // Write to new location
    fs.writeFileSync(to, content, 'utf-8');
    
    // Remove old file (if in-place and paths are different)
    if (this.isInPlace && from !== to) {
      fs.unlinkSync(from);
    }
  }

  async updateImports(filePath, changes) {
    if (!fs.existsSync(filePath) || changes.length === 0) return;

    let content = fs.readFileSync(filePath, 'utf-8');

    for (const change of changes) {
      // Escape special regex characters in the import path
      const escaped = change.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Match import statements with this path
      const patterns = [
        // import ... from 'path'
        new RegExp(`(from\\s+['"])${escaped}(['"])`, 'g'),
        // require('path')
        new RegExp(`(require\\s*\\(\\s*['"])${escaped}(['"]\\s*\\))`, 'g'),
        // import('path')
        new RegExp(`(import\\s*\\(\\s*['"])${escaped}(['"]\\s*\\))`, 'g'),
      ];

      for (const pattern of patterns) {
        content = content.replace(pattern, `$1${change.to}$2`);
      }
    }

    fs.writeFileSync(filePath, content, 'utf-8');
  }

  async copyToOutput() {
    await this.ensureDir(this.outputPath);
    
    const copyRecursive = (src, dest) => {
      if (fs.statSync(src).isDirectory()) {
        this.ensureDir(dest);
        const entries = fs.readdirSync(src);
        for (const entry of entries) {
          copyRecursive(path.join(src, entry), path.join(dest, entry));
        }
      } else {
        fs.copyFileSync(src, dest);
      }
    };

    copyRecursive(this.srcPath, this.outputPath);
  }

  async createBackup() {
    const backupPath = `${this.srcPath}_backup_${Date.now()}`;
    
    const copyRecursive = (src, dest) => {
      if (fs.statSync(src).isDirectory()) {
        this.ensureDir(dest);
        const entries = fs.readdirSync(src);
        for (const entry of entries) {
          copyRecursive(path.join(src, entry), path.join(dest, entry));
        }
      } else {
        fs.copyFileSync(src, dest);
      }
    };

    copyRecursive(this.srcPath, backupPath);
    this.backupPath = backupPath;
    
    console.log(chalk.gray(`  Backup created at: ${backupPath}`));
  }

  async restoreBackup() {
    if (!this.backupPath) return;

    // Remove current (broken) state
    fs.rmSync(this.srcPath, { recursive: true, force: true });
    
    // Restore from backup
    fs.renameSync(this.backupPath, this.srcPath);
    
    console.log(chalk.green('  Restored from backup'));
  }

  async cleanupEmptyDirs(dir) {
    if (!fs.existsSync(dir)) return;
    
    const entries = fs.readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      if (fs.statSync(fullPath).isDirectory()) {
        await this.cleanupEmptyDirs(fullPath);
      }
    }

    // Re-check if directory is empty after cleaning subdirs
    const remaining = fs.readdirSync(dir);
    if (remaining.length === 0 && dir !== this.srcPath) {
      fs.rmdirSync(dir);
    }
  }
}

module.exports = Migrator;
