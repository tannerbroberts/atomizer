import * as fs from 'fs';
import * as path from 'path';
import { ProjectIndex } from './ProjectIndex';
import { DependencyTracer } from './DependencyTracer';

/**
 * Migrator - Replaces Migrator.js
 *
 * Uses ts-morph to update import paths safely without regex.
 * Migrates files to their new locations based on computed structure.
 */
export class Migrator {
  private srcPath: string;
  private outputPath: string;
  private index: ProjectIndex;
  private tracer: DependencyTracer;

  constructor(srcPath: string, outputPath: string, index: ProjectIndex, tracer: DependencyTracer) {
    this.srcPath = path.resolve(srcPath);
    this.outputPath = path.resolve(outputPath);
    this.index = index;
    this.tracer = tracer;
  }

  /**
   * Execute the migration
   */
  async execute(newPaths: Map<string, string>): Promise<void> {
    console.log('\n📦 Executing migration...\n');

    console.log('Step 1: Creating directory structure...');
    await this.ensureDir(this.outputPath);
    const directories = new Set<string>();
    for (const [_, newPath] of newPaths) {
      directories.add(path.dirname(newPath));
    }
    for (const dir of directories) {
      const targetDir = dir.replace(this.srcPath, this.outputPath);
      await this.ensureDir(targetDir);
    }
    console.log(`   ✓ Created ${directories.size} directories\n`);

    console.log('Step 2: Updating import paths...');
    await this.updateImports(newPaths);
    console.log('   ✓ Import paths updated\n');

    console.log('Step 3: Copying files...');
    let copiedCount = 0;
    for (const [oldPath, newPath] of newPaths) {
      if (!fs.existsSync(oldPath)) continue;

      const targetPath = newPath.replace(this.srcPath, this.outputPath);
      await this.copyFile(oldPath, targetPath);

      if (oldPath !== newPath) {
        const relativeOld = path.relative(this.srcPath, oldPath);
        const relativeNew = path.relative(this.srcPath, newPath);
        console.log(`  ${relativeOld} → ${relativeNew}`);
      }
      copiedCount++;
    }
    console.log(`\n✓ Migration complete! Copied ${copiedCount} files to ${this.outputPath}`);

    console.log('\nStep 4: Saving updated files...');
    await this.index.getProject().save();
    console.log('   ✓ All files saved\n');
  }

  /**
   * Update all import/export paths using ts-morph
   */
  private async updateImports(newPaths: Map<string, string>): Promise<void> {
    for (const [oldPath, newPath] of newPaths) {
      const sourceFile = this.index.getSourceFile(oldPath);
      if (!sourceFile) continue;

      const importDecls = sourceFile.getImportDeclarations();
      for (const importDecl of importDecls) {
        const resolvedFile = importDecl.getModuleSpecifierSourceFile();
        if (!resolvedFile) continue;

        const oldImportPath = resolvedFile.getFilePath();
        const newImportPath = newPaths.get(oldImportPath);

        if (newImportPath) {
          const relativePath = this.calculateRelativePath(newPath, newImportPath);
          importDecl.setModuleSpecifier(relativePath);
        }
      }

      const exportDecls = sourceFile.getExportDeclarations();
      for (const exportDecl of exportDecls) {
        const moduleSpecifier = exportDecl.getModuleSpecifierValue();
        if (!moduleSpecifier) continue;

        const resolvedFile = exportDecl.getModuleSpecifierSourceFile();
        if (!resolvedFile) continue;

        const oldExportPath = resolvedFile.getFilePath();
        const newExportPath = newPaths.get(oldExportPath);

        if (newExportPath) {
          const relativePath = this.calculateRelativePath(newPath, newExportPath);
          exportDecl.setModuleSpecifier(relativePath);
        }
      }
    }
  }

  /**
   * Calculate relative import path from one file to another
   */
  private calculateRelativePath(fromPath: string, toPath: string): string {
    const fromDir = path.dirname(fromPath);
    let relative = path.relative(fromDir, toPath);

    relative = relative.replace(/\.(tsx?|jsx?)$/, '');
    relative = relative.replace(/\/index$/, '');

    if (relative === '' || relative === 'index') {
      relative = '.';
    }

    if (!relative.startsWith('.') && !relative.startsWith('/')) {
      relative = './' + relative;
    }

    return relative;
  }

  /**
   * Copy a file to new location
   */
  private async copyFile(fromPath: string, toPath: string): Promise<void> {
    await this.ensureDir(path.dirname(toPath));
    const content = fs.readFileSync(fromPath, 'utf-8');
    fs.writeFileSync(toPath, content, 'utf-8');
  }

  /**
   * Ensure directory exists
   */
  private async ensureDir(dir: string): Promise<void> {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
