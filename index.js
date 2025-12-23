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
      
      // Use the traced dependency data flow
      const traceResult = await atomizer.traceAllDependencies();
      
      if (options.dryRun) {
        // Show what the migration would do
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

program.parse();
