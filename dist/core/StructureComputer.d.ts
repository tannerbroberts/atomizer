import { DependencyTracer } from './DependencyTracer';
export interface FileInfo {
    filePath: string;
    name: string;
    extension: string;
    classification: string;
}
export interface MoveOperation {
    from: string;
    to: string;
    absoluteFrom: string;
    absoluteTo: string;
}
export interface ImportUpdate {
    file: string;
    changes: Array<{
        from: string;
        to: string;
    }>;
}
export interface ComputedStructure {
    moves: MoveOperation[];
    importUpdates: ImportUpdate[];
    newPaths: Map<string, string>;
}
export interface Graph {
    getParents(nodeId: string): string[];
    getChildren(nodeId: string): string[];
    getRoots(): string[];
    getNode(nodeId: string): any;
    nodeCount: number;
    edgeCount: number;
}
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
export declare class StructureComputer {
    private files;
    private renderTree;
    private dependencyGraph;
    private srcPath;
    private tracer;
    private fileMap;
    private fileToTracedDeclarations;
    constructor(files: FileInfo[], renderTree: Graph, dependencyGraph: Graph, srcPath: string, tracer?: DependencyTracer | null);
    compute(): ComputedStructure;
    private resolveCollisions;
    private toPascalCase;
    private toCamelCase;
    private identifyRoots;
    private isEntryPoint;
    private computeAtomicPaths;
    private processComponentTree;
    private isSpecialEntryPoint;
    private getComponentName;
    private findLCA;
    private computeSupportFilePaths;
    private findLCAWithPaths;
    private getExternalConsumers;
    private getHookFolderName;
    private getSupportFolderName;
    private findTestSourceFile;
    private computeImportUpdates;
}
