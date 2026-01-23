import { Project, SourceFile, Node, SyntaxKind, ImportDeclaration } from 'ts-morph';
export interface DeclarationInfo {
    node: Node;
    name: string;
    isExported: boolean;
    kind: SyntaxKind;
    filePath: string;
    relativePath: string;
}
export interface ImportInfo {
    node: ImportDeclaration;
    importedNames: Array<{
        local: string;
        imported: string;
    }>;
    source: string;
    resolvedPath: string | null;
    filePath: string;
    relativePath: string;
}
export interface ExportInfo {
    node: Node;
    exportedNames: Array<{
        local: string;
        exported: string;
    }>;
    source: string | null;
    resolvedPath: string | null;
    isReExport: boolean;
    filePath: string;
    relativePath: string;
}
export interface IndexStats {
    totalNodes: number;
    importNodes: number;
    exportNodes: number;
    declarationNodes: number;
}
/**
 * ProjectIndex - Replaces ProjectIndexer.js
 *
 * Uses ts-morph to load and index a TypeScript/JavaScript project.
 * Provides type-safe access to declarations, imports, and exports.
 */
export declare class ProjectIndex {
    private project;
    private srcPath;
    private declarations;
    private imports;
    private exports;
    private sourceFiles;
    constructor(srcPath: string, options?: {
        verbose?: boolean;
    });
    /**
     * Find tsconfig.json or jsconfig.json
     */
    private findTsConfig;
    /**
     * Load and index all source files
     */
    indexAll(files: Array<{
        absolutePath: string;
        relativePath: string;
        extension: string;
    }>): Promise<void>;
    /**
     * Index a single source file
     */
    private indexFile;
    /**
     * Index all declarations in a file
     */
    private indexDeclarations;
    /**
     * Index all imports in a file
     */
    private indexImports;
    /**
     * Index all exports in a file
     */
    private indexExports;
    /**
     * Get statistics about indexed nodes
     */
    getStats(): IndexStats;
    /**
     * Get all declarations
     */
    getDeclarations(): Map<Node, DeclarationInfo>;
    /**
     * Get all imports
     */
    getImports(): Map<ImportDeclaration, ImportInfo>;
    /**
     * Get all exports
     */
    getExports(): Map<Node, ExportInfo>;
    /**
     * Get the ts-morph Project instance
     */
    getProject(): Project;
    /**
     * Get all source files
     */
    getSourceFiles(): SourceFile[];
    /**
     * Get a source file by path
     */
    getSourceFile(filePath: string): SourceFile | undefined;
}
