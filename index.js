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
  .command('trace')
  .description('Trace top-level symbols in a file and their consumers')
  .argument('<filePath>', 'Path to the file to trace')
  .option('--src <path>', 'Path to the src folder')
  .action(async (filePath, options) => {
    try {
      const absoluteFilePath = path.resolve(filePath);
      let srcPath = options.src ? path.resolve(options.src) : path.join(process.cwd(), 'src');
      
      if (!options.src && (!fs.existsSync(srcPath) || !fs.statSync(srcPath).isDirectory())) {
        throw new Error(`Could not find 'src' folder in ${process.cwd()}. Use --src <path> to specify the source folder.`);
      }
      
      const atomizer = new Atomizer(srcPath, options);
      const symbols = await atomizer.trace(absoluteFilePath);
      
      atomizer.printTrace(absoluteFilePath, symbols);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('run')
  .description('Execute the reorganization (creates a migration plan)')
  .argument('<srcPath>', 'Path to the src folder to reorganize')
  .option('--dry-run', 'Show what would be done without making changes')
  .option('--output <path>', 'Output directory for reorganized structure')
  .action(async (srcPath, options) => {
    try {
      const atomizer = new Atomizer(srcPath, options);
      const result = await atomizer.analyze();
      
      if (options.dryRun) {
        atomizer.printMigrationPlan(result);
      } else {
        const outputPath = options.output || path.join(path.dirname(path.resolve(srcPath)), 'atomicSrc');
        await atomizer.execute(result, outputPath, options);
        console.log(chalk.green(`✓ Reorganization complete! New structure created at: ${outputPath}`));
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program.parse();
