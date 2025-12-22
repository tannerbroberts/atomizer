const path = require('path');
const chalk = require('chalk');
const FileInventory = require('./FileInventory');
const ASTAnalyzer = require('./ASTAnalyzer');
const GraphBuilder = require('./GraphBuilder');
const StructureComputer = require('./StructureComputer');
const Migrator = require('./Migrator');
const FileSplitter = require('./FileSplitter');
const SymbolTracer = require('./SymbolTracer');

class Atomizer {
  constructor(srcPath, options = {}) {
    this.srcPath = path.resolve(srcPath);
    this.options = options;
    this.verbose = options.verbose || false;
  }

  log(message) {
    if (this.verbose) {
      console.log(chalk.gray(`[DEBUG] ${message}`));
    }
  }

  async analyze() {
    console.log(chalk.blue('📦 Starting Atomizer analysis...'));
    console.log(chalk.gray(`   Source: ${this.srcPath}\n`));

    // Step 1: Parse & Inventory
    console.log(chalk.yellow('Step 1: Parsing & Inventory'));
    const inventory = new FileInventory(this.srcPath);
    const files = await inventory.scan();
    console.log(chalk.green(`   ✓ Found ${files.length} files\n`));

    // Step 2: AST Analysis & Resolution
    console.log(chalk.yellow('Step 2: AST Analysis & Module Resolution'));
    const analyzer = new ASTAnalyzer(this.srcPath, this.options);
    const analysisResults = await analyzer.analyzeAll(files);
    
    const components = analysisResults.filter(f => f.classification === 'component');
    const nonComponents = analysisResults.filter(f => f.classification !== 'component');
    const filesWithViolations = analysisResults.filter(f => f.violations?.length > 0);
    
    console.log(chalk.green(`   ✓ Components: ${components.length}`));
    console.log(chalk.green(`   ✓ Non-Components: ${nonComponents.length}`));
    
    if (filesWithViolations.length > 0 && !this.options.silent) {
      console.log(chalk.yellow(`   ⚠ Multi-export violations: ${filesWithViolations.length} files`));
    }
    console.log();

    // Step 3: Build Dual Graphs
    console.log(chalk.yellow('Step 3: Building Dual Graphs'));
    const graphBuilder = new GraphBuilder(analysisResults);
    const { renderTree, dependencyGraph } = graphBuilder.build();
    console.log(chalk.green(`   ✓ Render Tree: ${renderTree.nodeCount} nodes, ${renderTree.edgeCount} edges`));
    console.log(chalk.green(`   ✓ Dependency Graph: ${dependencyGraph.nodeCount} nodes, ${dependencyGraph.edgeCount} edges\n`));

    // Step 4: Compute New Structure
    console.log(chalk.yellow('Step 4: Computing New Structure'));
    const structureComputer = new StructureComputer(
      analysisResults,
      renderTree,
      dependencyGraph,
      this.srcPath
    );
    const newStructure = structureComputer.compute();
    console.log(chalk.green(`   ✓ Computed ${newStructure.moves.length} file moves\n`));

    return {
      files: analysisResults,
      components,
      nonComponents,
      renderTree,
      dependencyGraph,
      newStructure,
    };
  }

  async trace(targetFilePath) {
    const absolutePath = path.resolve(targetFilePath);
    console.log(chalk.blue(`🔍 Tracing symbols in: ${targetFilePath}`));
    
    // We still need to analyze the whole project to find external consumers
    console.log(chalk.yellow('Step 1: Scanning files...'));
    const inventory = new FileInventory(this.srcPath);
    const files = await inventory.scan();
    console.log(chalk.green(`   ✓ Found ${files.length} files`));

    console.log(chalk.yellow('Step 2: Analyzing ASTs...'));
    const analyzer = new ASTAnalyzer(this.srcPath, this.options);
    const analysisResults = await analyzer.analyzeAll(files);
    console.log(chalk.green('   ✓ Analysis complete'));

    console.log(chalk.yellow('Step 3: Tracing symbols...'));
    const tracer = new SymbolTracer(this.srcPath, analysisResults);
    return tracer.trace(absolutePath);
  }

  printTrace(filePath, symbols) {
    console.log(chalk.blue('\n═══════════════════════════════════════'));
    console.log(chalk.blue(`           TRACE: ${path.relative(this.srcPath, filePath)}`));
    console.log(chalk.blue('═══════════════════════════════════════\n'));

    for (const symbol of symbols) {
      const exportStatus = symbol.isExported ? chalk.green('[EXPORTED]') : chalk.gray('[INTERNAL]');
      console.log(`${exportStatus} ${chalk.white.bold(symbol.name)} (${symbol.type})`);
      
      if (symbol.internalConsumers.length > 0) {
        console.log(`   ${chalk.yellow('Internal Consumers:')}`);
        symbol.internalConsumers.forEach(c => console.log(`     - ${c}`));
      } else {
        console.log(`   ${chalk.gray('No internal consumers')}`);
      }

      if (symbol.externalConsumers.length > 0) {
        console.log(`   ${chalk.magenta('External Consumers:')}`);
        symbol.externalConsumers.forEach(c => console.log(`     - ${c}`));
      } else if (symbol.isExported) {
        console.log(`   ${chalk.gray('No external consumers')}`);
      }
      console.log();
    }
  }

  printAnalysis(result) {
    console.log(chalk.blue('\n═══════════════════════════════════════'));
    console.log(chalk.blue('           ANALYSIS RESULTS'));
    console.log(chalk.blue('═══════════════════════════════════════\n'));

    // Components
    console.log(chalk.cyan('📦 Components:'));
    for (const comp of result.components) {
      const relativePath = path.relative(this.srcPath, comp.filePath);
      console.log(`   ${chalk.white(comp.name)} ${chalk.gray(`(${relativePath})`)}`);
    }

    // Non-Components
    console.log(chalk.cyan('\n📄 Non-Components:'));
    for (const file of result.nonComponents) {
      const relativePath = path.relative(this.srcPath, file.filePath);
      console.log(`   ${chalk.white(file.name)} ${chalk.gray(`[${file.classification}]`)} ${chalk.gray(`(${relativePath})`)}`);
    }

    // Render Tree
    console.log(chalk.cyan('\n🌳 Render Tree (Component Composition):'));
    this.printTree(result.renderTree, result.components);

    // Proposed Structure
    console.log(chalk.cyan('\n📁 Proposed Structure:'));
    this.printProposedStructure(result.newStructure);
  }

  printTree(renderTree, components) {
    const roots = renderTree.getRoots();
    const visited = new Set();
    
    for (const root of roots) {
      this.printTreeNode(root, renderTree, '', true, visited, 0);
    }
  }

  printTreeNode(nodeId, tree, prefix, isLast, visited, depth) {
    // Prevent infinite recursion
    if (visited.has(nodeId) || depth > 10) {
      const connector = isLast ? '└── ' : '├── ';
      const node = tree.getNode(nodeId);
      const name = node ? node.name : nodeId;
      if (visited.has(nodeId)) {
        console.log(`   ${prefix}${connector}${chalk.yellow(name + ' (circular)')}`);
      }
      return;
    }
    
    visited.add(nodeId);
    
    const connector = isLast ? '└── ' : '├── ';
    const node = tree.getNode(nodeId);
    const name = node ? node.name : nodeId;
    
    console.log(`   ${prefix}${connector}${chalk.green(name)}`);
    
    const children = tree.getChildren(nodeId);
    const childPrefix = prefix + (isLast ? '    ' : '│   ');
    
    children.forEach((child, index) => {
      this.printTreeNode(child, tree, childPrefix, index === children.length - 1, visited, depth + 1);
    });
  }

  printProposedStructure(structure) {
    for (const move of structure.moves) {
      const from = chalk.red(move.from);
      const to = chalk.green(move.to);
      console.log(`   ${from} → ${to}`);
    }
  }

  printMigrationPlan(result) {
    console.log(chalk.blue('\n═══════════════════════════════════════'));
    console.log(chalk.blue('          MIGRATION PLAN (DRY RUN)'));
    console.log(chalk.blue('═══════════════════════════════════════\n'));

    const { moves, importUpdates } = result.newStructure;

    console.log(chalk.cyan('📦 File Moves:'));
    for (const move of moves) {
      console.log(`   ${chalk.yellow('MOVE')} ${move.from}`);
      console.log(`        → ${move.to}`);
    }

    console.log(chalk.cyan('\n📝 Import Updates:'));
    for (const update of importUpdates) {
      console.log(`   ${chalk.yellow('UPDATE')} ${update.file}`);
      for (const change of update.changes) {
        console.log(`        ${chalk.red(change.from)} → ${chalk.green(change.to)}`);
      }
    }
  }

  printViolations(filesWithViolations) {
    console.log(chalk.yellow('\n═══════════════════════════════════════'));
    console.log(chalk.yellow('      ⚠ MULTI-EXPORT VIOLATIONS'));
    console.log(chalk.yellow('═══════════════════════════════════════\n'));
    
    console.log(chalk.gray('Files with multiple exported hooks/components:\n'));
    
    for (const file of filesWithViolations) {
      const relativePath = path.relative(this.srcPath, file.filePath);
      console.log(chalk.red(`  ✗ ${relativePath}`));
      
      for (const violation of file.violations) {
        if (violation.hooks?.length > 0) {
          console.log(chalk.gray(`    Hooks: `) + chalk.cyan(violation.hooks.join(', ')));
        }
        if (violation.components?.length > 0) {
          console.log(chalk.gray(`    Components: `) + chalk.magenta(violation.components.join(', ')));
        }
        
        if (violation.suggestion?.length > 0) {
          console.log(chalk.gray(`    Split into:`));
          for (const s of violation.suggestion) {
            const icon = s.type === 'hook' ? '⚓' : '📦';
            console.log(chalk.green(`      ${icon} ${s.newFile}`) + chalk.gray(` (${s.exportName})`));
          }
        }
      }
      console.log();
    }
    
    console.log(chalk.gray(`Use --split to automatically split these files.`));
    console.log(chalk.gray(`Use --silent to suppress these warnings.\n`));
  }

  async execute(result, outputPath, options = {}) {
    const shouldSplit = options.splitFiles || this.options.splitFiles;
    
    // Handle file splitting first if requested
    if (shouldSplit) {
      const filesWithViolations = result.files.filter(f => f.violations?.length > 0);
      
      if (filesWithViolations.length > 0) {
        console.log(chalk.blue('\n✂️  Splitting multi-export files...'));
        const splitter = new FileSplitter(this.srcPath, this.options);
        const { splitOperations, updatedPaths, importRewrites } = 
          splitter.computeSplits(filesWithViolations, result.newStructure.newPaths);
        
        // Execute the splits
        await splitter.execute(splitOperations);
        
        // Update the structure with new paths
        result.newStructure.newPaths = updatedPaths;
        result.newStructure.splitImportRewrites = importRewrites;
        
        console.log(chalk.green(`   ✓ Split ${filesWithViolations.length} file(s)\n`));
      }
    }
    
    const migrator = new Migrator(this.srcPath, outputPath || this.srcPath, result.files);
    await migrator.execute(result.newStructure);
  }
}

module.exports = Atomizer;
