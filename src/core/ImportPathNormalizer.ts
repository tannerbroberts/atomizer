import * as path from 'path';
import { Project, SourceFile, SyntaxKind } from 'ts-morph';
import { ProjectIndex } from './ProjectIndex';

/**
 * ImportPathNormalizer - Iteration 2: Barrel File Creation
 *
 * Rewrites imports like:
 *   import { X } from "../Shared/Component"
 * To:
 *   import { X } from "../Shared"
 *
 * AND creates barrel files (Shared/index.ts) with exports
 *
 * Iteration 2 additions:
 * - Creates barrel files in target folders
 * - Exports all subfolders' default exports
 */
export class ImportPathNormalizer {
  private project: Project;
  private srcPath: string;
  private barrelFolders: Set<string> = new Set(); // Track folders that need barrel files

  constructor(srcPath: string) {
    this.srcPath = path.resolve(srcPath);
    this.project = new Project({
      tsConfigFilePath: this.findTsConfig(srcPath),
      skipAddingFilesFromTsConfig: true,
      compilerOptions: {
        allowJs: true,
        checkJs: false,
        noEmit: true,
        skipLibCheck: true,
      },
    });
  }

  private findTsConfig(srcPath: string): string | undefined {
    let searchDir = srcPath;
    for (let i = 0; i < 3; i++) {
      const tsconfigPath = path.join(searchDir, 'tsconfig.json');
      if (require('fs').existsSync(tsconfigPath)) {
        return tsconfigPath;
      }
      searchDir = path.dirname(searchDir);
    }
    return undefined;
  }

  /**
   * Normalize all imports in the project
   */
  async normalize(): Promise<void> {
    // 1. Find all TypeScript/JavaScript files
    const files = this.findSourceFiles();

    // 2. Load them into the project
    for (const file of files) {
      this.project.addSourceFileAtPath(file);
    }

    // 3. Process each file
    for (const sourceFile of this.project.getSourceFiles()) {
      this.normalizeFile(sourceFile);
    }

    // 4. Create barrel files for folders that need them
    await this.createBarrelFiles();

    // 5. Save changes
    await this.project.save();
  }

  /**
   * Find all source files in the project
   */
  private findSourceFiles(): string[] {
    const fs = require('fs');
    const files: string[] = [];

    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          // Skip node_modules
          if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
            walk(fullPath);
          }
        } else if (entry.isFile()) {
          if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
            files.push(fullPath);
          }
        }
      }
    };

    walk(this.srcPath);
    return files;
  }

  /**
   * Normalize imports in a single file
   */
  private normalizeFile(sourceFile: SourceFile): void {
    const imports = sourceFile.getImportDeclarations();
    const currentFileDir = path.dirname(sourceFile.getFilePath());

    for (const importDecl of imports) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();

      // Only process relative imports
      if (!moduleSpecifier.startsWith('.')) {
        continue;
      }

      // Skip CSS, asset, and other non-code imports
      if (/\.(css|scss|sass|less|png|jpg|jpeg|gif|svg|json|txt|md)$/i.test(moduleSpecifier)) {
        continue;
      }

      // Check if this looks like a nested import (ends with a component name)
      if (this.isNestedImport(moduleSpecifier)) {
        // Calculate original target folder (before normalization)
        const originalTargetFolder = path.resolve(currentFileDir, moduleSpecifier);
        const originalTargetParent = path.dirname(originalTargetFolder);

        const normalizedPath = this.normalizeImportPath(moduleSpecifier);

        // Don't rewrite if it would create a circular import (import from ".")
        if (normalizedPath === '.') {
          continue;
        }

        // Don't rewrite if target folder has an index.tsx component file
        // (we only want to rewrite to folders that will have barrel files)
        const fs = require('fs');
        const targetHasComponent = ['.tsx', '.jsx'].some(ext =>
          fs.existsSync(path.join(originalTargetParent, `index${ext}`))
        );

        if (targetHasComponent) {
          // Target folder is a component folder, not a barrel folder
          // Skip rewriting this import
          continue;
        }

        if (normalizedPath !== moduleSpecifier) {
          // The barrel file should go in the parent folder
          // For example: if importing from "../Shared/BlockVisual"
          // The barrel file goes in "../Shared"
          this.barrelFolders.add(originalTargetParent);

          // Rewrite the import
          importDecl.setModuleSpecifier(normalizedPath);
        }
      }
    }
  }

  /**
   * Detect if an import path is "nested" (imports from a specific file in a folder)
   * Examples:
   *   "../Shared/BlockVisual" -> true (nested)
   *   "../Shared" -> false (already normalized)
   *   "./index" -> false (index file)
   */
  private isNestedImport(importPath: string): boolean {
    const parts = importPath.split('/');
    const lastPart = parts[parts.length - 1];

    // If last part looks like a component name (PascalCase or has extension)
    // and is not "index", consider it nested
    if (lastPart === 'index' || lastPart === '.' || lastPart === '..') {
      return false;
    }

    // Check if it looks like a component (starts with uppercase)
    // or has an extension (Component.tsx, utils.js, etc.)
    return /^[A-Z]/.test(lastPart) || /\.(ts|tsx|js|jsx)$/.test(lastPart);
  }

  /**
   * Normalize an import path by removing the last segment
   * Example: "../Shared/BlockVisual" -> "../Shared"
   */
  private normalizeImportPath(importPath: string): string {
    const parts = importPath.split('/');

    // Remove the last part (the component/file name)
    parts.pop();

    // Return the folder path
    return parts.join('/') || '.';
  }

  /**
   * Create barrel files for all folders that need them
   * Iteration 2: Basic barrel file creation
   */
  private async createBarrelFiles(): Promise<void> {
    const fs = require('fs');

    for (const folderPath of this.barrelFolders) {
      // Skip if folder doesn't exist
      if (!fs.existsSync(folderPath)) {
        continue;
      }

      // Skip if any index file already exists (ts, tsx, js, jsx)
      const hasIndex = ['.ts', '.tsx', '.js', '.jsx'].some(ext =>
        fs.existsSync(path.join(folderPath, `index${ext}`))
      );

      if (hasIndex) {
        // Folder already has an index file, skip barrel creation
        continue;
      }

      const barrelPath = path.join(folderPath, 'index.ts');

      // Find all subfolders in this folder
      const entries = fs.readdirSync(folderPath, { withFileTypes: true });
      const exportStatements: string[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subfolderPath = path.join(folderPath, entry.name);
          const subfolderIndex = path.join(subfolderPath, 'index.ts');
          const subfolderIndexTsx = path.join(subfolderPath, 'index.tsx');

          // Check if subfolder has an index file
          if (fs.existsSync(subfolderIndex) || fs.existsSync(subfolderIndexTsx)) {
            // Generate export statement
            // For now, use wildcard export: export * from './SubFolder';
            exportStatements.push(`export * from './${entry.name}';`);
          }
        }
      }

      // Write barrel file
      if (exportStatements.length > 0) {
        const barrelContent = exportStatements.join('\n') + '\n';
        fs.writeFileSync(barrelPath, barrelContent, 'utf-8');
        console.log(`Created barrel file: ${barrelPath}`);
      }
    }
  }
}
