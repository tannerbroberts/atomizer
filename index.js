#!/usr/bin/env node

const { program } = require('commander');
const Atomizer = require('./src/Atomizer');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

program
  .name('atomizer')
  .description('Reorganize React folder structure based on the Render Tree')
  .version('0.1.0');

program
  .command('analyze')
  .description('Analyze the React project structure and show the proposed changes')
  .argument('<srcPath>', 'Path to the src folder to analyze')
  .option('--json', 'Output results as JSON')
  .option('--verbose', 'Show detailed analysis information')
  .action(async (srcPath, options) => {
    try {
      const atomizer = new Atomizer(srcPath, options);
      const result = await atomizer.analyze();

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        atomizer.printAnalysis(result);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('index')
  .description('Index all top-level AST nodes in the project (Phase 1)')
  .argument('<srcPath>', 'Path to the src folder to index')
  .option('--json', 'Output results as JSON')
  .option('--verbose', 'Show detailed indexing information')
  .action(async (srcPath, options) => {
    try {
      const atomizer = new Atomizer(srcPath, options);
      const result = await atomizer.index();

      if (options.json) {
        console.log(JSON.stringify(result.indexer.toJSON(), null, 2));
      } else {
        atomizer.printIndex(result);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command('trace')
  .description('Trace all declarations and their dependants (Phase 1 + 2)')
  .argument('<srcPath>', 'Path to the src folder to trace')
  .option('--json', 'Output results as JSON')
  .option('--verbose', 'Show detailed tracing information')
  .action(async (srcPath, options) => {
    try {
      const atomizer = new Atomizer(srcPath, options);
      const result = await atomizer.traceAllDependencies();

      if (options.json) {
        console.log(JSON.stringify(result.tracer.toJSON(), null, 2));
      } else {
        atomizer.printDependencyTrace(result);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command('run')
  .description('Execute the reorganization based on traced dependencies')
  .argument('[srcPath]', 'Path to the src folder to reorganize', './src')
  .option('--dry-run', 'Show what would be done without making changes')
  .option('--output <path>', 'Output directory for reorganized structure')
  .option('--verbose', 'Show detailed information')
  .action(async (srcPath, options) => {
    try {
      const resolvedSrcPath = path.resolve(srcPath);
      const atomizer = new Atomizer(resolvedSrcPath, options);


      const traceResult = await atomizer.traceAllDependencies();

      if (options.dryRun) {

        atomizer.printDependencyTrace(traceResult);
        console.log(chalk.yellow('\n[DRY RUN] No files were modified.'));
      } else {
        const outputPath = options.output || path.resolve('./atomicSrc');
        await atomizer.execute(traceResult, outputPath, options);
        console.log(chalk.green(`✓ Reorganization complete! New structure created at: ${outputPath}`));
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command('normalize-imports')
  .description('Normalize import paths to use folder-level imports (lint rule: import-from-index)')
  .argument('<srcPath>', 'Path to the src folder to normalize')
  .option('--dry-run', 'Show what would be done without making changes')
  .option('--verbose', 'Show detailed information')
  .action(async (srcPath, options) => {
    try {
      const { ImportPathNormalizer } = require('./dist/core/ImportPathNormalizer');
      const resolvedSrcPath = path.resolve(srcPath);

      console.log(chalk.blue('🔧 Import Path Normalizer'));
      console.log(chalk.gray(`Source: ${resolvedSrcPath}`));
      console.log(chalk.gray(`Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE'}\n`));

      const normalizer = new ImportPathNormalizer(resolvedSrcPath);

      if (options.dryRun) {
        console.log(chalk.yellow('[DRY RUN] Would normalize imports and create barrel files'));
        console.log(chalk.yellow('[DRY RUN] No files will be modified\n'));
      } else {
        await normalizer.normalize();
        console.log(chalk.green('✓ Import paths normalized'));
        console.log(chalk.green('✓ Barrel files created'));
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command('inline-reexports')
  .description('Inline re-exports to eliminate barrel export patterns (lint rule: no-reexports)')
  .argument('<srcPath>', 'Path to the src folder')
  .option('--dry-run', 'Show what would be done without making changes')
  .option('--verbose', 'Show detailed information')
  .action(async (srcPath, options) => {
    try {
      const { ReexportInliner } = require('./dist/core/ReexportInliner');
      const resolvedSrcPath = path.resolve(srcPath);

      console.log(chalk.blue('🔧 Re-export Inliner'));
      console.log(chalk.gray(`Source: ${resolvedSrcPath}`));
      console.log(chalk.gray(`Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE'}\n`));

      const inliner = new ReexportInliner(resolvedSrcPath);

      if (options.dryRun) {
        const reexports = await inliner.detectReexports();
        console.log(chalk.yellow(`[DRY RUN] Would inline ${reexports.length} files with re-exports:`));
        for (const file of reexports) {
          console.log(chalk.gray(`  - ${file.relativePath} (${file.reexportCount} exports)`));
        }
        console.log(chalk.yellow('\n[DRY RUN] No files will be modified\n'));
      } else {
        await inliner.inlineReexports();
        console.log(chalk.green('✓ Re-exports inlined'));
        console.log(chalk.green('✓ Declarations moved to index files'));
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program.parse();
