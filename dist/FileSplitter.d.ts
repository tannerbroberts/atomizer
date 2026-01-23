export = FileSplitter;
declare class FileSplitter {
    constructor(srcPath: any, options?: {});
    srcPath: any;
    options: {};
    /**
     * Split files with multiple exported hooks/components into separate files
     * @param {Array} filesToSplit - Files that have multiple exports
     * @param {Map} newPaths - The computed new paths for all files
     * @returns {Object} - { splitOperations, updatedPaths, importRewrites }
     */
    computeSplits(filesToSplit: any[], newPaths: Map<any, any>): Object;
    /**
     * Split a single file into multiple files
     */
    splitFile(file: any, existingPaths: any): {
        operations: ({
            type: string;
            filePath: any;
            content: string;
            exportName: any;
            originalFile: any;
        } | {
            type: string;
            filePath: any;
            content: string;
            exportName?: undefined;
            originalFile?: undefined;
        } | {
            type: string;
            filePath: any;
            content?: undefined;
            exportName?: undefined;
            originalFile?: undefined;
        })[];
        newPaths: Map<any, any>;
        importRewrites: {};
    };
    /**
     * Collect all top-level declarations from AST
     */
    collectDeclarations(ast: any, content: any): Map<any, any>;
    /**
     * Collect all imports from AST
     */
    collectImports(ast: any, content: any): {
        source: any;
        code: any;
        range: any;
        specifiers: any;
    }[];
    /**
     * Find what other declarations this export depends on
     */
    findDependencies(exportName: any, declarations: any, content: any): Set<any>;
    /**
     * Check if an identifier is actually used in code (not just in strings)
     */
    isIdentifierUsed(code: any, identifier: any): boolean;
    /**
     * Build content for a new split file
     */
    buildNewFileContent({ exportName, declaration, dependencies, imports, sharedExports, siblingDeps, newFilePath, originalFile, originalContent, isDefault, fileDir }: {
        exportName: any;
        declaration: any;
        dependencies: any;
        imports: any;
        sharedExports: any;
        siblingDeps: any;
        newFilePath: any;
        originalFile: any;
        originalContent: any;
        isDefault: any;
        fileDir: any;
    }): string;
    /**
     * Filter imports to only those needed by the given code
     */
    filterImports(imports: any, code: any, dependencies: any): any[];
    /**
     * Build content for the original file after splitting (remaining shared exports)
     */
    buildRemainingContent({ originalContent, ast, removedExports, imports }: {
        originalContent: any;
        ast: any;
        removedExports: any;
        imports: any;
    }): string;
    /**
     * Execute the split operations
     */
    execute(splitOperations: any, outputPath: any): Promise<void>;
}
