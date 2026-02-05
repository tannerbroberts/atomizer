export = Atomizer;
/**
 * Atomizer - Main orchestrator using ts-morph-based modules
 *
 * This is the new implementation that uses the ts-morph rewrite.
 */
declare class Atomizer {
    constructor(srcPath: any, options?: {});
    srcPath: string;
    options: {
        includeTests: boolean;
    };
    verbose: any;
    log(message: any): void;
    /**
     * Phase 1: Index all source files using ts-morph
     */
    index(): Promise<{
        index: any;
        stats: any;
        files: {
            relativePath: string;
            absolutePath: string;
            extension: string;
            name: string;
        }[];
    }>;
    /**
     * Phase 2: Trace declaration dependencies using ts-morph
     */
    traceAllDependencies(): Promise<{
        index: any;
        tracer: any;
        stats: any;
        summary: any;
        files: {
            relativePath: string;
            absolutePath: string;
            extension: string;
            name: string;
        }[];
    }>;
    /**
     * Analyze the project (uses legacy AST analyzer for now)
     */
    analyze(): Promise<{
        files: any[];
        components: any[];
        nonComponents: any[];
        renderTree: {
            name: any;
            nodes: Map<any, any>;
            edges: Map<any, any>;
            reverseEdges: Map<any, any>;
            addNode(id: any, data: any): void;
            addEdge(from: any, to: any, data?: {}): void;
            getNode(id: any): any;
            getChildren(id: any): any[];
            getParents(id: any): any[];
            getRoots(): any[];
            getLeaves(): any[];
            get nodeCount(): number;
            get edgeCount(): number;
            hasCycle(): boolean;
            topologicalSort(): any[];
            getAncestors(nodeId: any): Set<any>;
            getDescendants(nodeId: any): Set<any>;
        };
        dependencyGraph: {
            name: any;
            nodes: Map<any, any>;
            edges: Map<any, any>;
            reverseEdges: Map<any, any>;
            addNode(id: any, data: any): void;
            addEdge(from: any, to: any, data?: {}): void;
            getNode(id: any): any;
            getChildren(id: any): any[];
            getParents(id: any): any[];
            getRoots(): any[];
            getLeaves(): any[];
            get nodeCount(): number;
            get edgeCount(): number;
            hasCycle(): boolean;
            topologicalSort(): any[];
            getAncestors(nodeId: any): Set<any>;
            getDescendants(nodeId: any): Set<any>;
        };
        newStructure: any;
        tracer: any;
        index: any;
    }>;
    /**
     * Execute the migration using ts-morph
     */
    execute(traceResult: any, outputPath: any, options?: {}): Promise<void>;
    printIndex(result: any): void;
    printDependencyTrace(result: any): void;
    printAnalysis(result: any): void;
    printTree(renderTree: any, components: any): void;
    printTreeNode(nodeId: any, tree: any, prefix: any, isLast: any, visited: any, depth: any): void;
    printProposedStructure(structure: any): void;
}
