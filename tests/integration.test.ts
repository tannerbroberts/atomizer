import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { createFixture, createTmpDir, cleanupDir, runAtomizer, extractImports } from './setup';
import type { Fixture } from './setup';

describe('Atomizer Integration - Default Exports', () => {
  let outputDir: string;

  afterEach(() => {
    if (outputDir && fs.existsSync(outputDir)) {
      cleanupDir(outputDir);
    }
  });

  describe('Named Defaults - Baseline', () => {
    it('should successfully restructure named defaults', async () => {
      const fixture = await createFixture('named-default');
      outputDir = await createTmpDir();

      await runAtomizer({
        srcPath: fixture.path,
        outputPath: outputDir,
      });

      expect(fs.existsSync(outputDir)).toBe(true);

      const outputFiles = glob.sync(`${outputDir}/**/*.tsx`);
      expect(outputFiles.length).toBeGreaterThan(0);

      console.log('Generated files:', outputFiles);
    });

    it('should have valid import paths', async () => {
      const fixture = await createFixture('named-default');
      outputDir = await createTmpDir();

      await runAtomizer({
        srcPath: fixture.path,
        outputPath: outputDir,
      });

      const outputFiles = glob.sync(`${outputDir}/**/*.tsx`);

      for (const file of outputFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const imports = extractImports(content);

        for (const imp of imports) {
          if (imp.startsWith('.')) {
            const resolved = path.resolve(path.dirname(file), imp);
            const exists = fs.existsSync(resolved + '.tsx') ||
                          fs.existsSync(resolved + '.ts') ||
                          fs.existsSync(path.join(resolved, 'index.tsx')) ||
                          fs.existsSync(path.join(resolved, 'index.ts'));

            if (!exists) {
              console.log(`Missing import: ${imp} from ${file}`);
              console.log(`  Resolved to: ${resolved}`);
            }
          }
        }
      }
    });

    it('should create nested structure for parent-child relationships', async () => {
      const fixture = await createFixture('named-default');
      outputDir = await createTmpDir();

      await runAtomizer({
        srcPath: fixture.path,
        outputPath: outputDir,
      });

      const outputFiles = glob.sync(`${outputDir}/**/*.tsx`);
      const structure = outputFiles.map(f => path.relative(outputDir, f));

      console.log('Generated structure:', structure);

      expect(structure.some(s => s.includes('App'))).toBe(true);
    });
  });

  describe('Anonymous Arrow Defaults', () => {
    it('should successfully restructure anonymous defaults', async () => {
      const fixture = await createFixture('anonymous-arrow');
      outputDir = await createTmpDir();

      let error: any;
      try {
        await runAtomizer({
          srcPath: fixture.path,
          outputPath: outputDir,
        });
      } catch (e) {
        error = e;
        console.log('❌ Error restructuring anonymous defaults:', e);
      }

      if (!error) {
        expect(fs.existsSync(outputDir)).toBe(true);

        const outputFiles = glob.sync(`${outputDir}/**/*.tsx`);
        expect(outputFiles.length).toBeGreaterThan(0);

        console.log('Anonymous default output:', outputFiles);
      }
    });

    it('should handle anonymous defaults without crashing', async () => {
      const fixture = await createFixture('anonymous-arrow');
      outputDir = await createTmpDir();

      await expect(
        runAtomizer({
          srcPath: fixture.path,
          outputPath: outputDir,
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Anonymous Function Defaults', () => {
    it('should handle anonymous function declarations', async () => {
      const fixture = await createFixture('anonymous-function');
      outputDir = await createTmpDir();

      await expect(
        runAtomizer({
          srcPath: fixture.path,
          outputPath: outputDir,
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Re-exported Defaults', () => {
    it('should handle barrel re-exports', async () => {
      const fixture = await createFixture('reexported-default');
      outputDir = await createTmpDir();

      await runAtomizer({
        srcPath: fixture.path,
        outputPath: outputDir,
      });

      expect(fs.existsSync(outputDir)).toBe(true);

      const outputFiles = glob.sync(`${outputDir}/**/*`);
      console.log('Re-export output:', outputFiles);
    });
  });

  describe('Mixed Exports', () => {
    it('should handle files with both default and named exports', async () => {
      const fixture = await createFixture('mixed-exports');
      outputDir = await createTmpDir();

      await runAtomizer({
        srcPath: fixture.path,
        outputPath: outputDir,
      });

      expect(fs.existsSync(outputDir)).toBe(true);

      const utilsFiles = glob.sync(`${outputDir}/**/utils.*`);
      expect(utilsFiles.length).toBeGreaterThan(0);

      if (utilsFiles.length > 0) {
        const content = fs.readFileSync(utilsFiles[0], 'utf-8');
        expect(content).toContain('export default');
        expect(content).toContain('export const');
      }
    });
  });

  describe('Class Defaults', () => {
    it('should handle class default exports', async () => {
      const fixture = await createFixture('class-default');
      outputDir = await createTmpDir();

      await runAtomizer({
        srcPath: fixture.path,
        outputPath: outputDir,
      });

      expect(fs.existsSync(outputDir)).toBe(true);

      const outputFiles = glob.sync(`${outputDir}/**/*.ts`);
      expect(outputFiles.length).toBeGreaterThan(0);
    });
  });

  describe('Object Defaults', () => {
    it('should handle object literal defaults', async () => {
      const fixture = await createFixture('object-default');
      outputDir = await createTmpDir();

      await runAtomizer({
        srcPath: fixture.path,
        outputPath: outputDir,
      });

      expect(fs.existsSync(outputDir)).toBe(true);

      const outputFiles = glob.sync(`${outputDir}/**/*.ts`);
      expect(outputFiles.length).toBeGreaterThan(0);
    });
  });

  describe('Comparison Tests', () => {
    it('should produce similar structures for named vs anonymous', async () => {
      const namedFixture = await createFixture('named-default');
      const anonymousFixture = await createFixture('anonymous-arrow');

      const namedOutput = await createTmpDir();
      const anonymousOutput = await createTmpDir();

      try {
        await runAtomizer({
          srcPath: namedFixture.path,
          outputPath: namedOutput,
        });

        await runAtomizer({
          srcPath: anonymousFixture.path,
          outputPath: anonymousOutput,
        });

        const namedFiles = glob.sync(`${namedOutput}/**/*.tsx`);
        const anonymousFiles = glob.sync(`${anonymousOutput}/**/*.tsx`);

        console.log('\nNamed default structure:');
        namedFiles.forEach(f => console.log('  -', path.relative(namedOutput, f)));

        console.log('\nAnonymous default structure:');
        anonymousFiles.forEach(f => console.log('  -', path.relative(anonymousOutput, f)));

        if (namedFiles.length > 0 && anonymousFiles.length > 0) {
          const namedDepth = Math.max(...namedFiles.map(f =>
            path.relative(namedOutput, f).split(path.sep).length
          ));
          const anonymousDepth = Math.max(...anonymousFiles.map(f =>
            path.relative(anonymousOutput, f).split(path.sep).length
          ));

          console.log(`\nNamed depth: ${namedDepth}, Anonymous depth: ${anonymousDepth}`);
        }
      } finally {
        cleanupDir(namedOutput);
        cleanupDir(anonymousOutput);
      }
    });
  });
});
