"use strict";
const path = require('path');
const chalk = require('chalk');
const FileInventory = require('./FileInventory');
const { ProjectIndex } = require('../dist/core/ProjectIndex');
const { DependencyTracer } = require('../dist/core/DependencyTracer');
const { StructureComputer } = require('../dist/core/StructureComputer');
const { Migrator } = require('../dist/core/Migrator');
const ASTAnalyzer = require('./ASTAnalyzer');
const GraphBuilder = require('./GraphBuilder');
/**
 * Atomizer - Main orchestrator using ts-morph-based modules
 *
 * This is the new implementation that uses the ts-morph rewrite.
 */
class Atomizer {
    constructor(srcPath, options = {}) {
        this.srcPath = path.resolve(srcPath);
        this.options = {
            includeTests: false,
            ...options,
        };
        this.verbose = options.verbose || false;
    }
    log(message) {
        if (this.verbose) {
            console.log(chalk.gray(`[DEBUG] ${message}`));
        }
    }
    /**
     * Phase 1: Index all source files using ts-morph
     */
    async index() {
        console.log(chalk.blue('📦 Starting Atomizer indexing (Phase 1)...'));
        console.log(chalk.gray(`   Source: ${this.srcPath}\n`));
        console.log(chalk.yellow('Step 1: Scanning files...'));
        const inventory = new FileInventory(this.srcPath, this.options);
        const files = await inventory.scan();
        console.log(chalk.green(`   ✓ Found ${files.length} files\n`));
        console.log(chalk.yellow('Step 2: Indexing with ts-morph...'));
        const index = new ProjectIndex(this.srcPath, this.options);
        await index.indexAll(files);
        const stats = index.getStats();
        console.log(chalk.green(`   ✓ Total nodes:       ${stats.totalNodes}`));
        console.log(chalk.green(`   ✓ Import nodes:      ${stats.importNodes}`));
        console.log(chalk.green(`   ✓ Export nodes:      ${stats.exportNodes}`));
        console.log(chalk.green(`   ✓ Declaration nodes: ${stats.declarationNodes}\n`));
        return {
            index,
            stats,
            files,
        };
    }
    /**
     * Phase 2: Trace declaration dependencies using ts-morph
     */
    async traceAllDependencies() {
        const { index, stats, files } = await this.index();
        console.log(chalk.yellow('Step 3: Tracing dependencies with ts-morph...'));
        const tracer = new DependencyTracer(index);
        tracer.traceAll();
        const summary = tracer.getSummary();
        console.log(chalk.green(`   ✓ Traced ${summary.totalDeclarations} declarations`));
        console.log(chalk.green(`   ✓ With internal dependants: ${summary.withInternalDependants}`));
        console.log(chalk.green(`   ✓ With external dependants: ${summary.withExternalDependants}`));
        console.log(chalk.green(`   ✓ Orphaned (no dependants): ${summary.orphaned}\n`));
        return {
            index,
            tracer,
            stats,
            summary,
            files,
        };
    }
    /**
     * Analyze the project (uses legacy AST analyzer for now)
     */
    async analyze() {
        console.log(chalk.blue('📦 Starting Atomizer analysis...'));
        console.log(chalk.gray(`   Source: ${this.srcPath}\n`));
        console.log(chalk.yellow('Step 1: Scanning files...'));
        const inventory = new FileInventory(this.srcPath, this.options);
        const files = await inventory.scan();
        console.log(chalk.green(`   ✓ Found ${files.length} files\n`));
        console.log(chalk.yellow('Step 2: Indexing with ts-morph...'));
        const index = new ProjectIndex(this.srcPath, this.options);
        await index.indexAll(files);
        console.log(chalk.green(`   ✓ Indexed ${index.getStats().totalNodes} nodes\n`));
        console.log(chalk.yellow('Step 3: Tracing dependencies...'));
        const tracer = new DependencyTracer(index);
        tracer.traceAll();
        const tracerSummary = tracer.getSummary();
        console.log(chalk.green(`   ✓ Traced ${tracerSummary.totalDeclarations} declarations`));
        console.log(chalk.green(`   ✓ With external dependants: ${tracerSummary.withExternalDependants}\n`));
        console.log(chalk.yellow('Step 4: AST Analysis & Module Resolution'));
        const analyzer = new ASTAnalyzer(this.srcPath, this.options);
        const analysisResults = await analyzer.analyzeAll(files);
        const components = analysisResults.filter(f => f.classification === 'component');
        const nonComponents = analysisResults.filter(f => f.classification !== 'component');
        console.log(chalk.green(`   ✓ Components: ${components.length}`));
        console.log(chalk.green(`   ✓ Non-Components: ${nonComponents.length}\n`));
        console.log(chalk.yellow('Step 5: Building Dual Graphs'));
        const graphBuilder = new GraphBuilder(analysisResults);
        const { renderTree, dependencyGraph } = graphBuilder.build();
        console.log(chalk.green(`   ✓ Render Tree: ${renderTree.nodeCount} nodes, ${renderTree.edgeCount} edges`));
        console.log(chalk.green(`   ✓ Dependency Graph: ${dependencyGraph.nodeCount} nodes, ${dependencyGraph.edgeCount} edges\n`));
        console.log(chalk.yellow('Step 6: Computing New Structure'));
        const structureComputer = new StructureComputer(analysisResults, renderTree, dependencyGraph, this.srcPath, tracer);
        const newStructure = structureComputer.compute();
        console.log(chalk.green(`   ✓ Computed ${newStructure.moves.length} file moves\n`));
        return {
            files: analysisResults,
            components,
            nonComponents,
            renderTree,
            dependencyGraph,
            newStructure,
            tracer,
            index,
        };
    }
    /**
     * Execute the migration using ts-morph
     */
    async execute(traceResult, outputPath, options = {}) {
        const targetPath = outputPath || path.join(path.dirname(this.srcPath), 'atomicSrc');
        const analyzer = new ASTAnalyzer(this.srcPath, this.options);
        const files = traceResult.files || await new FileInventory(this.srcPath, this.options).scan();
        const analysisResults = await analyzer.analyzeAll(files);
        const graphBuilder = new GraphBuilder(analysisResults);
        const { renderTree, dependencyGraph } = graphBuilder.build();
        const structureComputer = new StructureComputer(analysisResults, renderTree, dependencyGraph, this.srcPath, traceResult.tracer);
        const newStructure = structureComputer.compute();
        const migrator = new Migrator(this.srcPath, targetPath, traceResult.index, traceResult.tracer);
        await migrator.execute(newStructure.newPaths);
    }
    printIndex(result) {
        console.log(chalk.blue('\n═══════════════════════════════════════'));
        console.log(chalk.blue('           PROJECT INDEX'));
        console.log(chalk.blue('═══════════════════════════════════════\n'));
        const { stats } = result;
        console.log(chalk.cyan('📊 Statistics:'));
        console.log(`   Total nodes:       ${stats.totalNodes}`);
        console.log(`   Import nodes:      ${stats.importNodes}`);
        console.log(`   Export nodes:      ${stats.exportNodes}`);
        console.log(`   Declaration nodes: ${stats.declarationNodes}`);
        console.log(chalk.cyan('\n📦 Declarations by file:'));
        const declsByFile = new Map();
        for (const [node, declInfo] of result.index.getDeclarations()) {
            const rel = declInfo.relativePath;
            if (!declsByFile.has(rel)) {
                declsByFile.set(rel, []);
            }
            declsByFile.get(rel).push(declInfo);
        }
        for (const [file, decls] of declsByFile) {
            console.log(`   ${chalk.white(file)}`);
            for (const decl of decls) {
                const exported = decl.isExported ? chalk.green('[exported]') : chalk.gray('[internal]');
                console.log(`     ${exported} ${decl.name}`);
            }
        }
    }
    printDependencyTrace(result) {
        console.log(chalk.blue('\n═══════════════════════════════════════'));
        console.log(chalk.blue('        DEPENDENCY TRACE RESULTS'));
        console.log(chalk.blue('═══════════════════════════════════════\n'));
        const { tracer, summary } = result;
        console.log(chalk.cyan('📊 Summary:'));
        console.log(`   Total declarations:        ${summary.totalDeclarations}`);
        console.log(`   With internal dependants:  ${summary.withInternalDependants}`);
        console.log(`   With external dependants:  ${summary.withExternalDependants}`);
        console.log(`   Orphaned (no dependants):  ${summary.orphaned}`);
        console.log(chalk.cyan('\n🔗 Declaration Dependencies:\n'));
        const byFile = new Map();
        for (const [node, info] of tracer.getTraced()) {
            const rel = info.declaration.relativePath;
            if (!byFile.has(rel)) {
                byFile.set(rel, []);
            }
            byFile.get(rel).push(info);
        }
        for (const [file, infos] of byFile) {
            console.log(chalk.white.bold(`📄 ${file}`));
            for (const info of infos) {
                const decl = info.declaration;
                const exported = decl.isExported ? chalk.green('[exported]') : chalk.gray('[internal]');
                console.log(`   ${exported} ${chalk.yellow(decl.name)}`);
                if (info.internal.length > 0) {
                    console.log(`      ${chalk.blue('Internal dependants: ' + info.internal.length)}`);
                }
                if (info.external.size > 0) {
                    console.log(`      ${chalk.magenta('External dependants: ' + info.external.size)}`);
                    for (const [_, filePath] of info.external) {
                        const relPath = path.relative(this.srcPath, filePath);
                        console.log(`        → ${relPath}`);
                    }
                }
                if (info.internal.length === 0 && info.external.size === 0) {
                    console.log(`      ${chalk.gray('No dependants (orphaned)')}`);
                }
            }
            console.log();
        }
    }
    printAnalysis(result) {
        console.log(chalk.blue('\n═══════════════════════════════════════'));
        console.log(chalk.blue('           ANALYSIS RESULTS'));
        console.log(chalk.blue('═══════════════════════════════════════\n'));
        console.log(chalk.cyan('📦 Components:'));
        for (const comp of result.components) {
            const relativePath = path.relative(this.srcPath, comp.filePath);
            console.log(`   ${chalk.white(comp.name)} ${chalk.gray(`(${relativePath})`)}`);
        }
        console.log(chalk.cyan('\n📄 Non-Components:'));
        for (const file of result.nonComponents) {
            const relativePath = path.relative(this.srcPath, file.filePath);
            console.log(`   ${chalk.white(file.name)} ${chalk.gray(`[${file.classification}]`)} ${chalk.gray(`(${relativePath})`)}`);
        }
        console.log(chalk.cyan('\n🌳 Render Tree (Component Composition):'));
        this.printTree(result.renderTree, result.components);
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
}
module.exports = Atomizer;
