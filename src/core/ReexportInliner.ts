import * as path from 'path';
import * as fs from 'fs';
import { Project, SourceFile, SyntaxKind, ExportDeclaration } from 'ts-morph';

export interface ReexportInfo {
  filePath: string;
  relativePath: string;
  reexportCount: number;
  sourceFiles: string[];
  exports: Array<{
    names: string[];
    source: string;
    isTypeOnly: boolean;
  }>;
}

/**
 * ReexportInliner - Iteration 5: Detection Phase
 *
 * Detects files that use re-export patterns:
 *   export { X } from './Source'
 *
 * Lint rule violation: architecture/no-reexports
 *
 * Iteration 5 goal: Just detect and report, don't modify yet
 */
export class ReexportInliner {
  private project: Project;
  private srcPath: string;
  private sourceFilesToDelete: Set<string> = new Set();

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
      if (fs.existsSync(tsconfigPath)) {
        return tsconfigPath;
      }
      searchDir = path.dirname(searchDir);
    }
    return undefined;
  }

  /**
   * Detect all files with re-export patterns
   */
  async detectReexports(): Promise<ReexportInfo[]> {
    const files = this.findSourceFiles();

    // Load files into project
    for (const file of files) {
      this.project.addSourceFileAtPath(file);
    }

    const reexports: ReexportInfo[] = [];

    for (const sourceFile of this.project.getSourceFiles()) {
      const fileReexports = this.analyzeFileReexports(sourceFile);

      if (fileReexports.reexportCount > 0) {
        reexports.push(fileReexports);
      }
    }

    return reexports;
  }

  /**
   * Analyze a single file for re-exports
   */
  private analyzeFileReexports(sourceFile: SourceFile): ReexportInfo {
    const exportDeclarations = sourceFile.getExportDeclarations();
    const reexportDecls = exportDeclarations.filter(
      (decl) => decl.getModuleSpecifierValue() !== undefined
    );

    const exports: ReexportInfo['exports'] = [];
    const sourceFilesSet = new Set<string>();
    let totalNameCount = 0;

    for (const decl of reexportDecls) {
      const moduleSpecifier = decl.getModuleSpecifierValue();
      if (!moduleSpecifier) continue;

      const isTypeOnly = decl.isTypeOnly();
      const namedExports = decl.getNamedExports();
      const names = namedExports.map((exp) => exp.getName());

      // Count individual exported names
      totalNameCount += names.length;

      // Track source file name (without path/extension)
      const sourceName = path.basename(moduleSpecifier, path.extname(moduleSpecifier));
      sourceFilesSet.add(sourceName);

      exports.push({
        names,
        source: moduleSpecifier,
        isTypeOnly,
      });
    }

    const filePath = sourceFile.getFilePath();
    const relativePath = path.relative(this.srcPath, filePath);

    return {
      filePath,
      relativePath,
      reexportCount: totalNameCount, // Count individual names, not declarations
      sourceFiles: Array.from(sourceFilesSet),
      exports,
    };
  }

  /**
   * Find all source files in the project
   */
  private findSourceFiles(): string[] {
    const files: string[] = [];

    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
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
   * Inline all re-exports by moving declarations into index files
   * Iteration 6: Naive implementation
   * Iteration 8: Added source file deletion
   */
  async inlineReexports(): Promise<void> {
    const reexports = await this.detectReexports();

    // Clear tracking set
    this.sourceFilesToDelete.clear();

    for (const fileInfo of reexports) {
      await this.inlineFile(fileInfo);
    }

    // Save all changes
    await this.project.save();

    // Delete source files after successful save
    this.deleteSourceFiles();
  }

  /**
   * Inline re-exports in a single file
   */
  private async inlineFile(fileInfo: ReexportInfo): Promise<void> {
    const indexFile = this.project.getSourceFile(fileInfo.filePath);
    if (!indexFile) return;

    const indexDir = path.dirname(fileInfo.filePath);
    const newContent: string[] = [];
    const allImports = new Set<string>();
    let containsJsx = false;

    // Collect imports from the index file
    const indexImports = indexFile.getImportDeclarations();
    for (const imp of indexImports) {
      allImports.add(imp.getText());
    }

    // Deduplicate source files (multiple export statements may reference the same file)
    const uniqueSources = new Set<string>();
    for (const reexport of fileInfo.exports) {
      uniqueSources.add(reexport.source);
    }

    // Process each unique source file
    for (const source of uniqueSources) {
      const sourcePath = path.resolve(indexDir, source);

      // Try different extensions
      let sourceFile: SourceFile | undefined;
      let sourceExt: string | undefined;
      for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
        const tryPath = sourcePath + ext;
        sourceFile = this.project.getSourceFile(tryPath);
        if (sourceFile) {
          sourceExt = ext;
          break;
        }
      }

      if (!sourceFile) {
        console.warn(`Could not find source file: ${sourcePath}`);
        continue;
      }

      // Track this file for deletion after successful inlining
      this.sourceFilesToDelete.add(sourceFile.getFilePath());

      // Track if we're inlining JSX
      if (sourceExt === '.tsx' || sourceExt === '.jsx') {
        containsJsx = true;
      }

      // Extract imports from source file, filtering out imports from other inlined sources
      const sourceImports = sourceFile.getImportDeclarations();
      for (const imp of sourceImports) {
        const importPath = imp.getModuleSpecifierValue();

        // Skip imports that reference other files being inlined
        const isInlinedSource = Array.from(uniqueSources).some(src => importPath === src);
        if (isInlinedSource) {
          continue;
        }

        allImports.add(imp.getText());
      }

      // Extract ALL declarations from source file (not just exported ones)
      // This ensures we get internal dependencies like non-exported contexts
      const declarations = this.extractAllDeclarations(sourceFile);
      newContent.push(...declarations);
    }

    // Build new index file content
    const finalContent = [
      ...Array.from(allImports),
      '',
      ...newContent,
    ].join('\n');

    // If inlining JSX into a .ts file, rename to .tsx
    if (containsJsx && fileInfo.filePath.endsWith('.ts')) {
      const newPath = fileInfo.filePath.replace(/\.ts$/, '.tsx');

      // Delete old .ts file and create new .tsx file
      indexFile.deleteImmediatelySync();
      const newIndexFile = this.project.createSourceFile(newPath, finalContent, { overwrite: true });

      console.log(`Renamed ${path.basename(fileInfo.filePath)} -> ${path.basename(newPath)} (contains JSX)`);
    } else {
      // Replace index file content
      indexFile.replaceWithText(finalContent);
    }
  }

  /**
   * Extract ALL declarations from a source file
   * Includes both exported and non-exported declarations
   * Iteration 7: Copy everything except imports (imports are merged separately)
   */
  private extractAllDeclarations(sourceFile: SourceFile): string[] {
    const declarations: string[] = [];
    const statements = sourceFile.getStatements();

    for (const stmt of statements) {
      // Skip import statements (we handle those separately)
      if (stmt.getKind() === SyntaxKind.ImportDeclaration) {
        continue;
      }

      // Skip export declarations (re-exports from other files)
      if (stmt.getKind() === SyntaxKind.ExportDeclaration) {
        continue;
      }

      // Copy everything else
      declarations.push(stmt.getText());
    }

    return declarations;
  }

  /**
   * Extract exported declarations from a source file
   * Iteration 7: Simpler text-based approach
   * NOTE: This is kept for potential future use but not currently used
   */
  private extractExportedDeclarations(sourceFile: SourceFile, exportNames: string[]): string[] {
    const declarations: string[] = [];
    const nameSet = new Set(exportNames);
    const statements = sourceFile.getStatements();

    for (const stmt of statements) {
      const text = stmt.getText();

      // Check if this statement exports one of our target names
      for (const name of nameSet) {
        // Match various export patterns
        const patterns = [
          `export function ${name}`,
          `export const ${name}`,
          `export let ${name}`,
          `export var ${name}`,
          `export type ${name}`,
          `export interface ${name}`,
          `export class ${name}`,
          `export enum ${name}`,
        ];

        // Check if any pattern matches
        const matches = patterns.some(pattern => text.includes(pattern));

        if (matches) {
          // Copy the exact statement text (already includes "export")
          declarations.push(text);
          nameSet.delete(name); // Found it, don't check again
          break;
        }
      }
    }

    return declarations;
  }

  /**
   * Delete source files that were inlined into index files
   * Iteration 8: Cleanup orphaned files
   */
  private deleteSourceFiles(): void {
    if (this.sourceFilesToDelete.size === 0) {
      return;
    }

    console.log('\nDeleting inlined source files:');

    for (const filePath of this.sourceFilesToDelete) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          const relativePath = path.relative(this.srcPath, filePath);
          console.log(`  ✓ Deleted: ${relativePath}`);
        }
      } catch (error) {
        const relativePath = path.relative(this.srcPath, filePath);
        console.error(`  ✗ Failed to delete: ${relativePath}`, error);
      }
    }

    console.log(`\nCleaned up ${this.sourceFilesToDelete.size} orphaned source files`);
    this.sourceFilesToDelete.clear();
  }
}
