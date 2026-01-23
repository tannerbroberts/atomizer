import { Node } from 'ts-morph';
import { ProjectIndex, DeclarationInfo } from './ProjectIndex';
export interface DependencyInfo {
    declaration: DeclarationInfo;
    internal: Node[];
    external: Map<Node, string>;
}
export interface TraceSummary {
    totalDeclarations: number;
    withInternalDependants: number;
    withExternalDependants: number;
    orphaned: number;
}
/**
 * DependencyTracer - Replaces DependencyTracer.js + ScopeAnalyzer.js
 *
 * Uses ts-morph's findReferencesAsNodes() to trace declaration usage.
 * This eliminates the need for manual scope analysis and regex fallbacks.
 */
export declare class DependencyTracer {
    private index;
    private traced;
    constructor(index: ProjectIndex);
    /**
     * Trace all declarations in the project
     */
    traceAll(): Map<Node, DependencyInfo>;
    /**
     * Trace a single declaration's dependencies
     * Uses manual identifier search as a simple starting implementation
     */
    private traceDeclaration;
    /**
     * Check if a declaration is exported as default
     */
    private isDefaultExport;
    /**
     * Get the top-level node (statement) containing a reference
     */
    private getTopLevelNode;
    /**
     * Get traced dependencies
     */
    getTraced(): Map<Node, DependencyInfo>;
    /**
     * Get summary statistics
     */
    getSummary(): TraceSummary;
    /**
     * Check if a declaration is exported
     */
    isExported(node: Node): boolean;
    /**
     * Get dependencies for a specific node
     */
    getDependencies(node: Node): DependencyInfo | undefined;
    /**
     * Get all declarations in a file
     */
    getDeclarationsInFile(filePath: string): DeclarationInfo[];
    /**
     * Find all external dependants of a declaration (files that import it)
     */
    getExternalDependants(node: Node): Map<string, Node[]>;
    /**
     * Find all internal dependants (same file usage)
     */
    getInternalDependants(node: Node): Node[];
}
