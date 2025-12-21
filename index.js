#!/usr/bin/env node

const { program } = require('commander');
const Atomizer = require('./src/Atomizer');
const chalk = require('chalk');

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
  .option('--silent', 'Suppress warnings about multi-export files')
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
  .command('run')
  .description('Execute the reorganization (creates a migration plan)')
  .argument('<srcPath>', 'Path to the src folder to reorganize')
  .option('--dry-run', 'Show what would be done without making changes')
  .option('--output <path>', 'Output directory for reorganized structure')
  .option('--silent', 'Suppress warnings about multi-export files')
  .option('--split', 'Automatically split multi-export files (no prompt)')
  .option('--no-split', 'Skip splitting multi-export files (no prompt)')
  .action(async (srcPath, options) => {
    try {
      const atomizer = new Atomizer(srcPath, options);
      const result = await atomizer.analyze();
      
      // Check for violations and handle split decision
      const violations = result.files.filter(f => f.violations?.length > 0);
      
      if (violations.length > 0 && !options.silent) {
        atomizer.printViolations(violations);
        
        // Determine split behavior
        let shouldSplit = options.split;
        
        if (shouldSplit === undefined && !options.dryRun) {
          // Interactive prompt
          shouldSplit = await promptYesNo(
            `\n${chalk.yellow('?')} Split ${violations.length} multi-export file(s) into separate files? (y/n) `
          );
        }
        
        if (shouldSplit) {
          options.splitFiles = true;
        }
      }
      
      if (options.dryRun) {
        atomizer.printMigrationPlan(result);
      } else {
        await atomizer.execute(result, options.output, options);
        console.log(chalk.green('✓ Reorganization complete!'));
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Simple yes/no prompt
function promptYesNo(question) {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}

program.parse();
