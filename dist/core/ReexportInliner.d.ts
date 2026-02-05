export interface ReexportInfo {
    filePath: string;
    relativePath: string;
    reexportCount: number;
    sourceFiles: string[];
    exports: Array<{
        names: string[];
        source: string;
        isTypeOnly: boolean;
    }>;
}
/**
 * ReexportInliner - Iteration 5: Detection Phase
 *
 * Detects files that use re-export patterns:
 *   export { X } from './Source'
 *
 * Lint rule violation: architecture/no-reexports
 *
 * Iteration 5 goal: Just detect and report, don't modify yet
 */
export declare class ReexportInliner {
    private project;
    private srcPath;
    private sourceFilesToDelete;
    constructor(srcPath: string);
    private findTsConfig;
    /**
     * Detect all files with re-export patterns
     */
    detectReexports(): Promise<ReexportInfo[]>;
    /**
     * Analyze a single file for re-exports
     */
    private analyzeFileReexports;
    /**
     * Find all source files in the project
     */
    private findSourceFiles;
    /**
     * Inline all re-exports by moving declarations into index files
     * Iteration 6: Naive implementation
     * Iteration 8: Added source file deletion
     */
    inlineReexports(): Promise<void>;
    /**
     * Inline re-exports in a single file
     */
    private inlineFile;
    /**
     * Extract ALL declarations from a source file
     * Includes both exported and non-exported declarations
     * Iteration 7: Copy everything except imports (imports are merged separately)
     */
    private extractAllDeclarations;
    /**
     * Extract exported declarations from a source file
     * Iteration 7: Simpler text-based approach
     * NOTE: This is kept for potential future use but not currently used
     */
    private extractExportedDeclarations;
    /**
     * Delete source files that were inlined into index files
     * Iteration 8: Cleanup orphaned files
     */
    private deleteSourceFiles;
}
