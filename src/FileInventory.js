const { glob } = require('glob');
const path = require('path');
const fs = require('fs');

class FileInventory {
  constructor(srcPath, options = {}) {
    this.srcPath = srcPath;
    this.includeTests = options.includeTests !== false; // Include tests by default
  }

  async scan() {
    const patterns = [
      '**/*.js',
      '**/*.jsx',
      '**/*.ts',
      '**/*.tsx',
      '**/*.css',
      '**/*.scss',
      '**/*.less',
      '**/*.json',
      '**/*.svg',
      '**/*.png',
      '**/*.jpg',
      '**/*.jpeg',
      '**/*.gif',
    ];

    const ignorePatterns = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
    ];

    // Only ignore test files if explicitly requested
    if (!this.includeTests) {
      ignorePatterns.push('**/*.test.*', '**/*.spec.*', '**/__tests__/**');
    }

    // Always ignore mocks as they have special resolution
    ignorePatterns.push('**/__mocks__/**');

    const files = [];

    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: this.srcPath,
        ignore: ignorePatterns,
        absolute: false,
      });

      for (const match of matches) {
        const absolutePath = path.join(this.srcPath, match);
        const stats = fs.statSync(absolutePath);
        
        if (stats.isFile()) {
          files.push({
            relativePath: match,
            absolutePath,
            extension: path.extname(match),
            name: path.basename(match, path.extname(match)),
          });
        }
      }
    }

    // Deduplicate
    const seen = new Set();
    return files.filter(f => {
      if (seen.has(f.absolutePath)) return false;
      seen.add(f.absolutePath);
      return true;
    });
  }
}

module.exports = FileInventory;
