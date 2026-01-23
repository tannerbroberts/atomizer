"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StructureComputer = void 0;
const path = __importStar(require("path"));
/**
 * StructureComputer - Replaces StructureComputer.js
 *
 * Computes new file structure based on render tree and dependency graph.
 * Uses ts-morph-based DependencyTracer for accurate dependency tracking.
 *
 * STRICT HIERARCHY RULES:
 * 1. Folders named after components/hooks (PascalCase for components, camelCase for hooks)
 * 2. Each folder has an index file that defines the main export
 * 3. Children (components, hooks, or support files) are nested inside their parent folder
 * 4. NO loose files at any level - everything is a folder with an index
 * 5. NO special directories like lib/, utils/, hooks/, types/, constants/
 * 6. Shared code goes to the Lowest Common Ancestor folder
 * 7. Assets are the ONLY exception - they can be loose files inside a component folder
 */
class StructureComputer {
    constructor(files, renderTree, dependencyGraph, srcPath, tracer = null) {
        this.files = files;
        this.renderTree = renderTree;
        this.dependencyGraph = dependencyGraph;
        this.srcPath = srcPath;
        this.tracer = tracer;
        this.fileMap = new Map();
        for (const file of files) {
            this.fileMap.set(file.filePath, file);
        }
        this.fileToTracedDeclarations = new Map();
        if (tracer) {
            const traced = tracer.getTraced();
            for (const [_, info] of traced) {
                const filePath = info.declaration.filePath;
                if (!this.fileToTracedDeclarations.has(filePath)) {
                    this.fileToTracedDeclarations.set(filePath, []);
                }
                this.fileToTracedDeclarations.get(filePath).push(info);
            }
        }
    }
    compute() {
        const moves = [];
        const importUpdates = [];
        const newPaths = new Map();
        const roots = this.identifyRoots();
        const atomicPaths = this.computeAtomicPaths(roots);
        const supportPaths = this.computeSupportFilePaths(atomicPaths);
        for (const [filePath, newPath] of atomicPaths) {
            newPaths.set(filePath, newPath);
        }
        for (const [filePath, newPath] of supportPaths) {
            newPaths.set(filePath, newPath);
        }
        this.resolveCollisions(newPaths);
        for (const [oldPath, newPath] of newPaths) {
            if (oldPath !== newPath) {
                const relativeOld = path.relative(this.srcPath, oldPath);
                const relativeNew = path.relative(this.srcPath, newPath);
                moves.push({
                    from: relativeOld,
                    to: relativeNew,
                    absoluteFrom: oldPath,
                    absoluteTo: newPath,
                });
            }
        }
        for (const file of this.files) {
            const updates = this.computeImportUpdates(file, newPaths);
            if (updates.length > 0) {
                importUpdates.push({
                    file: path.relative(this.srcPath, newPaths.get(file.filePath) || file.filePath),
                    changes: updates,
                });
            }
        }
        return { moves, importUpdates, newPaths };
    }
    resolveCollisions(newPaths) {
        const destToSources = new Map();
        for (const [oldPath, newPath] of newPaths) {
            if (!destToSources.has(newPath)) {
                destToSources.set(newPath, []);
            }
            destToSources.get(newPath).push(oldPath);
        }
        for (const [dest, sources] of destToSources) {
            if (sources.length <= 1)
                continue;
            for (const source of sources) {
                const originalRelative = path.relative(this.srcPath, source);
                const parts = originalRelative.split(path.sep);
                if (parts.length >= 2) {
                    const parentDir = parts[parts.length - 2];
                    const fileName = parts[parts.length - 1];
                    const file = this.fileMap.get(source);
                    const ext = file?.extension || path.extname(fileName);
                    const baseName = path.basename(fileName, ext);
                    const uniqueName = this.toPascalCase(parentDir) + this.toPascalCase(baseName);
                    const destDir = path.dirname(path.dirname(dest));
                    const newDest = path.join(destDir, uniqueName, 'index' + ext);
                    newPaths.set(source, newDest);
                }
                else {
                    newPaths.set(source, source);
                }
            }
        }
    }
    toPascalCase(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    toCamelCase(str) {
        return str.charAt(0).toLowerCase() + str.slice(1);
    }
    identifyRoots() {
        const roots = [];
        const components = this.files.filter(f => f.classification === 'component');
        for (const comp of components) {
            const parents = this.renderTree.getParents(comp.filePath);
            const isEntryPoint = this.isEntryPoint(comp);
            if (parents.length === 0 || isEntryPoint) {
                roots.push(comp.filePath);
            }
        }
        return roots;
    }
    isEntryPoint(file) {
        const name = file.name.toLowerCase();
        const relativePath = path.relative(this.srcPath, file.filePath).toLowerCase();
        const entryPatterns = [
            'app',
            'index',
            'main',
            'root',
            '_app',
            '_document',
            'layout',
            'page',
        ];
        if (relativePath.includes('pages/') || relativePath.includes('app/')) {
            return true;
        }
        return entryPatterns.some(pattern => name.includes(pattern));
    }
    computeAtomicPaths(roots) {
        const paths = new Map();
        const processed = new Set();
        for (const root of roots) {
            this.processComponentTree(root, this.srcPath, paths, processed);
        }
        const components = this.files.filter(f => f.classification === 'component');
        for (const comp of components) {
            if (!processed.has(comp.filePath)) {
                this.processComponentTree(comp.filePath, this.srcPath, paths, processed);
            }
        }
        return paths;
    }
    processComponentTree(nodeId, parentDir, paths, processed) {
        if (processed.has(nodeId))
            return;
        processed.add(nodeId);
        const file = this.fileMap.get(nodeId);
        if (!file || file.classification !== 'component')
            return;
        if (this.isSpecialEntryPoint(file)) {
            paths.set(nodeId, file.filePath);
            return;
        }
        const componentName = this.getComponentName(file);
        const newDir = path.join(parentDir, componentName);
        const newPath = path.join(newDir, 'index' + (file.extension || '.tsx'));
        paths.set(nodeId, newPath);
        const children = this.renderTree.getChildren(nodeId);
        for (const childId of children) {
            const childFile = this.fileMap.get(childId);
            if (!childFile || childFile.classification !== 'component')
                continue;
            const childParents = this.renderTree.getParents(childId);
            if (childParents.length === 1) {
                this.processComponentTree(childId, newDir, paths, processed);
            }
            else {
                if (!processed.has(childId)) {
                    const lca = this.findLCA(childParents, paths);
                    this.processComponentTree(childId, lca, paths, processed);
                }
            }
        }
    }
    isSpecialEntryPoint(file) {
        const name = file.name.toLowerCase();
        return name === 'main' || name === 'index';
    }
    getComponentName(file) {
        let name = file.name;
        if (name === 'index') {
            const dir = path.dirname(file.filePath);
            name = path.basename(dir);
        }
        return this.toPascalCase(name);
    }
    findLCA(nodeIds, existingPaths) {
        if (nodeIds.length === 0)
            return this.srcPath;
        if (nodeIds.length === 1) {
            const existingPath = existingPaths.get(nodeIds[0]);
            return existingPath ? path.dirname(path.dirname(existingPath)) : this.srcPath;
        }
        const nodePaths = nodeIds.map(id => {
            const existing = existingPaths.get(id);
            if (existing) {
                return path.dirname(existing);
            }
            const file = this.fileMap.get(id);
            return file ? path.dirname(file.filePath) : this.srcPath;
        });
        const parts = nodePaths.map(p => path.relative(this.srcPath, p).split(path.sep));
        const commonParts = [];
        const minLength = Math.min(...parts.map(p => p.length));
        for (let i = 0; i < minLength; i++) {
            const current = parts[0][i];
            if (parts.every(p => p[i] === current)) {
                commonParts.push(current);
            }
            else {
                break;
            }
        }
        return path.join(this.srcPath, ...commonParts);
    }
    computeSupportFilePaths(atomicPaths) {
        const paths = new Map();
        const supportFiles = this.files.filter(f => f.classification !== 'component' &&
            f.classification !== 'barrel' &&
            f.classification !== 'test-setup' &&
            f.classification !== 'root-config');
        const allPaths = new Map(atomicPaths);
        let remaining = [...supportFiles];
        let maxIterations = 10;
        while (remaining.length > 0 && maxIterations > 0) {
            maxIterations--;
            const stillRemaining = [];
            for (const file of remaining) {
                if (this.isSpecialEntryPoint(file)) {
                    paths.set(file.filePath, file.filePath);
                    allPaths.set(file.filePath, file.filePath);
                    continue;
                }
                const importers = this.getExternalConsumers(file.filePath);
                const allImportersResolved = importers.every(imp => allPaths.has(imp));
                if (importers.length > 0 && !allImportersResolved) {
                    stillRemaining.push(file);
                    continue;
                }
                let targetDir;
                if (importers.length === 0) {
                    targetDir = this.srcPath;
                }
                else if (importers.length === 1) {
                    const importerPath = allPaths.get(importers[0]) || importers[0];
                    targetDir = path.dirname(importerPath);
                }
                else {
                    targetDir = this.findLCAWithPaths(importers, allPaths);
                }
                let newPath;
                if (file.classification === 'asset') {
                    newPath = path.join(targetDir, file.name + file.extension);
                }
                else if (file.classification === 'test') {
                    const sourceFile = this.findTestSourceFile(file);
                    if (sourceFile) {
                        const sourcePath = allPaths.get(sourceFile.filePath) || sourceFile.filePath;
                        const sourceDir = path.dirname(sourcePath);
                        newPath = path.join(sourceDir, file.name + file.extension);
                    }
                    else {
                        newPath = file.filePath;
                    }
                }
                else if (file.classification === 'hook') {
                    const folderName = this.getHookFolderName(file);
                    newPath = path.join(targetDir, folderName, 'index' + file.extension);
                }
                else {
                    const folderName = this.getSupportFolderName(file);
                    newPath = path.join(targetDir, folderName, 'index' + file.extension);
                }
                paths.set(file.filePath, newPath);
                allPaths.set(file.filePath, newPath);
            }
            if (stillRemaining.length === remaining.length) {
                for (const file of stillRemaining) {
                    if (this.isSpecialEntryPoint(file)) {
                        paths.set(file.filePath, file.filePath);
                    }
                    else if (file.classification === 'asset') {
                        paths.set(file.filePath, path.join(this.srcPath, file.name + file.extension));
                    }
                    else {
                        const folderName = file.classification === 'hook'
                            ? this.getHookFolderName(file)
                            : this.getSupportFolderName(file);
                        paths.set(file.filePath, path.join(this.srcPath, folderName, 'index' + file.extension));
                    }
                }
                break;
            }
            remaining = stillRemaining;
        }
        const barrelFiles = this.files.filter(f => f.classification === 'barrel');
        for (const barrel of barrelFiles) {
            paths.set(barrel.filePath, barrel.filePath);
        }
        const rootConfigFiles = this.files.filter(f => f.classification === 'root-config');
        for (const config of rootConfigFiles) {
            paths.set(config.filePath, config.filePath);
        }
        return paths;
    }
    findLCAWithPaths(nodeIds, resolvedPaths) {
        if (nodeIds.length === 0)
            return this.srcPath;
        if (nodeIds.length === 1) {
            const existingPath = resolvedPaths.get(nodeIds[0]);
            return existingPath ? path.dirname(existingPath) : this.srcPath;
        }
        const nodePaths = nodeIds.map(id => {
            const resolved = resolvedPaths.get(id);
            if (resolved) {
                return path.dirname(resolved);
            }
            return path.dirname(id);
        });
        const parts = nodePaths.map(p => path.relative(this.srcPath, p).split(path.sep));
        const commonParts = [];
        const minLength = Math.min(...parts.map(p => p.length));
        for (let i = 0; i < minLength; i++) {
            const current = parts[0][i];
            if (parts.every(p => p[i] === current)) {
                commonParts.push(current);
            }
            else {
                break;
            }
        }
        return path.join(this.srcPath, ...commonParts);
    }
    getExternalConsumers(filePath) {
        if (this.tracer && this.fileToTracedDeclarations.has(filePath)) {
            const tracedDeclarations = this.fileToTracedDeclarations.get(filePath);
            const consumerFilePaths = new Set();
            for (const info of tracedDeclarations) {
                const externalDeps = info.external;
                for (const [_, depFilePath] of externalDeps) {
                    if (depFilePath && depFilePath !== filePath) {
                        consumerFilePaths.add(depFilePath);
                    }
                }
            }
            return Array.from(consumerFilePaths);
        }
        return this.dependencyGraph.getParents(filePath);
    }
    getHookFolderName(file) {
        let name = file.name;
        if (name === 'index') {
            const dir = path.dirname(file.filePath);
            name = path.basename(dir);
        }
        return name.startsWith('use') ? name : 'use' + this.toPascalCase(name);
    }
    getSupportFolderName(file) {
        let name = file.name;
        if (name === 'index') {
            const dir = path.dirname(file.filePath);
            name = path.basename(dir);
        }
        return this.toPascalCase(name);
    }
    findTestSourceFile(testFile) {
        const testName = testFile.name.replace(/\.(test|spec)$/, '');
        for (const file of this.files) {
            if (file.name === testName && file.classification !== 'test') {
                const testDir = path.dirname(testFile.filePath);
                const fileDir = path.dirname(file.filePath);
                if (testDir === fileDir || path.dirname(testDir) === fileDir) {
                    return file;
                }
            }
        }
        return null;
    }
    computeImportUpdates(file, newPaths) {
        return [];
    }
}
exports.StructureComputer = StructureComputer;
