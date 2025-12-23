const path = require('path');
const chalk = require('chalk');
const FileInventory = require('./FileInventory');
const ASTAnalyzer = require('./ASTAnalyzer');
const GraphBuilder = require('./GraphBuilder');
const StructureComputer = require('./StructureComputer');
const Migrator = require('./Migrator');
const FileSplitter = require('./FileSplitter');
const SymbolTracer = require('./SymbolTracer');
const ProjectIndexer = require('./ProjectIndexer');
const DependencyTracer = require('./DependencyTracer');

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

  /**
   * Phase 1: Index all source files
   * Creates the 4 maps as described in README:
   * - project: All top-level nodes with UUID keys
   * - imports: Import nodes only
   * - exports: Export nodes only
   * - declarations: Declaration nodes only
   */
  async index() {
    console.log(chalk.blue('📦 Starting Atomizer indexing (Phase 1)...'));
    console.log(chalk.gray(`   Source: ${this.srcPath}\n`));

    // Step 1: Scan for files
    console.log(chalk.yellow('Step 1: Scanning files...'));
    const inventory = new FileInventory(this.srcPath);
    const files = await inventory.scan();
    console.log(chalk.green(`   ✓ Found ${files.length} files\n`));

    // Step 2: Index all top-level AST nodes with UUIDs
    console.log(chalk.yellow('Step 2: Indexing top-level AST nodes...'));
    const indexer = new ProjectIndexer(this.srcPath, this.options);
    const maps = await indexer.indexAll(files);
    
    const stats = indexer.getStats();
    console.log(chalk.green(`   ✓ Total nodes:       ${stats.totalNodes}`));
    console.log(chalk.green(`   ✓ Import nodes:      ${stats.importNodes}`));
    console.log(chalk.green(`   ✓ Export nodes:      ${stats.exportNodes}`));
    console.log(chalk.green(`   ✓ Declaration nodes: ${stats.declarationNodes}\n`));

    return {
      indexer,
      maps,
      stats,
      files,
    };
  }

  /**
   * Phase 2: Trace declaration dependencies
   * For each declaration, finds:
   * - Internal dependants: Other top-level nodes in same file that use it
   * - External dependants: Nodes in other files that import and use it
   */
  async traceAllDependencies() {
    // First, run the indexing phase
    const { indexer, maps, stats, files } = await this.index();

    console.log(chalk.yellow('Step 3: Tracing declaration dependencies...'));
    const tracer = new DependencyTracer(indexer);
    const traced = tracer.traceAll();
    
    const summary = tracer.getSummary();
    console.log(chalk.green(`   ✓ Traced ${summary.totalDeclarations} declarations`));
    console.log(chalk.green(`   ✓ With internal dependants: ${summary.withInternalDependants}`));
    console.log(chalk.green(`   ✓ With external dependants: ${summary.withExternalDependants}`));
    console.log(chalk.green(`   ✓ Orphaned (no dependants): ${summary.orphaned}\n`));

    return {
      indexer,
      tracer,
      maps,
      traced,
      stats,
      summary,
      files,
    };
  }

  printIndex(result) {
    console.log(chalk.blue('\n═══════════════════════════════════════'));
    console.log(chalk.blue('           PROJECT INDEX'));
    console.log(chalk.blue('═══════════════════════════════════════\n'));

    const { maps, stats } = result;

    console.log(chalk.cyan('📊 Statistics:'));
    console.log(`   Total nodes:       ${stats.totalNodes}`);
    console.log(`   Import nodes:      ${stats.importNodes}`);
    console.log(`   Export nodes:      ${stats.exportNodes}`);
    console.log(`   Declaration nodes: ${stats.declarationNodes}`);

    console.log(chalk.cyan('\n📦 Declarations by file:'));
    const declsByFile = new Map();
    for (const [uuid, node] of maps.declarations) {
      const rel = node.relativePath;
      if (!declsByFile.has(rel)) {
        declsByFile.set(rel, []);
      }
      declsByFile.get(rel).push(node);
    }

    for (const [file, decls] of declsByFile) {
      console.log(`   ${chalk.white(file)}`);
      for (const decl of decls) {
        const names = decl.declaredNames.join(', ') || 'anonymous';
        const exported = decl.isExported ? chalk.green('[exported]') : chalk.gray('[internal]');
        console.log(`     ${exported} ${names} (${decl.nodeType})`);
      }
    }
  }

  printDependencyTrace(result) {
    console.log(chalk.blue('\n═══════════════════════════════════════'));
    console.log(chalk.blue('        DEPENDENCY TRACE RESULTS'));
    console.log(chalk.blue('═══════════════════════════════════════\n'));

    const { traced, maps, summary } = result;

    console.log(chalk.cyan('📊 Summary:'));
    console.log(`   Total declarations:        ${summary.totalDeclarations}`);
    console.log(`   With internal dependants:  ${summary.withInternalDependants}`);
    console.log(`   With external dependants:  ${summary.withExternalDependants}`);
    console.log(`   Orphaned (no dependants):  ${summary.orphaned}`);

    console.log(chalk.cyan('\n🔗 Declaration Dependencies:\n'));

    // Group by file
    const byFile = new Map();
    for (const [uuid, node] of traced) {
      const rel = node.relativePath;
      if (!byFile.has(rel)) {
        byFile.set(rel, []);
      }
      byFile.get(rel).push({ uuid, ...node });
    }

    for (const [file, nodes] of byFile) {
      console.log(chalk.white.bold(`📄 ${file}`));
      
      for (const node of nodes) {
        const names = node.declaredNames?.join(', ') || 'anonymous';
        const exported = node.isExported ? chalk.green('[exported]') : chalk.gray('[internal]');
        console.log(`   ${exported} ${chalk.yellow(names)}`);

        if (node.dependant.internal.length > 0) {
          console.log(`      ${chalk.blue('Internal dependants:')}`);
          for (const depUuid of node.dependant.internal) {
            const depNode = maps.project.get(depUuid);
            const depNames = depNode?.names?.join(', ') || depNode?.nodeType || depUuid.slice(0, 8);
            console.log(`        → ${depNames}`);
          }
        }

        const externalDeps = Object.keys(node.dependant.external);
        if (externalDeps.length > 0) {
          console.log(`      ${chalk.magenta('External dependants:')}`);
          for (const depUuid of externalDeps) {
            const depNode = maps.project.get(depUuid);
            const depFile = depNode?.relativePath || 'unknown';
            const depNames = depNode?.names?.join(', ') || depNode?.nodeType || depUuid.slice(0, 8);
            console.log(`        → ${depFile}: ${depNames}`);
          }
        }

        if (node.dependant.internal.length === 0 && externalDeps.length === 0) {
          console.log(`      ${chalk.gray('No dependants (orphaned)')}`);
        }
      }
      console.log();
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
    
    console.log(chalk.green(`   ✓ Components: ${components.length}`));
    console.log(chalk.green(`   ✓ Non-Components: ${nonComponents.length}`));
    
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

    console.log(chalk.cyan('📦 File Copies:'));
    for (const move of moves) {
      console.log(`   ${chalk.yellow('COPY')} ${move.from}`);
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

  async execute(result, outputPath, options = {}) {
    const targetPath = outputPath || path.join(path.dirname(this.srcPath), 'atomicSrc');

    // Always split multi-export files in atomic mode
    const filesToSplit = result.files.filter(f => 
      (f.exportedHooks?.length + f.exportedComponents?.length) > 1
    );
    
    if (filesToSplit.length > 0) {
      console.log(chalk.blue('\n✂️  Splitting multi-export files...'));
      const splitter = new FileSplitter(this.srcPath, this.options);
      const { splitOperations, updatedPaths, importRewrites } = 
        splitter.computeSplits(filesToSplit, result.newStructure.newPaths);
      
      // Execute the splits directly into the target path
      await splitter.execute(splitOperations, targetPath);
      
      // Update the structure with new paths
      result.newStructure.newPaths = updatedPaths;
      result.newStructure.splitImportRewrites = importRewrites;
      
      console.log(chalk.green(`   ✓ Split ${filesToSplit.length} file(s)\n`));
    }
    
    const migrator = new Migrator(this.srcPath, targetPath, result.files);
    await migrator.execute(result.newStructure);
  }
}

module.exports = Atomizer;
