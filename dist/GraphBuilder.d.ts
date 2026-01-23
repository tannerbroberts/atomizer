export = GraphBuilder;
declare class GraphBuilder {
    constructor(analysisResults: any);
    files: any;
    fileMap: Map<any, any>;
    build(): {
        renderTree: Graph;
        dependencyGraph: Graph;
    };
    buildRenderTree(): Graph;
    buildImportNameMap(components: any): Map<any, any>;
    resolveJSXToImport(file: any, jsxName: any, importNameToFile: any): any;
    /**
     * Follow barrel re-exports to find the actual file that exports the given name.
     */
    followBarrelReexport(barrelFile: any, exportName: any, visited?: Set<any>): any;
    buildDependencyGraph(): Graph;
}
declare class Graph {
    constructor(name: any);
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
}
