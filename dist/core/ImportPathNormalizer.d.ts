/**
 * ImportPathNormalizer - Iteration 2: Barrel File Creation
 *
 * Rewrites imports like:
 *   import { X } from "../Shared/Component"
 * To:
 *   import { X } from "../Shared"
 *
 * AND creates barrel files (Shared/index.ts) with exports
 *
 * Iteration 2 additions:
 * - Creates barrel files in target folders
 * - Exports all subfolders' default exports
 */
export declare class ImportPathNormalizer {
    private project;
    private srcPath;
    private barrelFolders;
    constructor(srcPath: string);
    private findTsConfig;
    /**
     * Normalize all imports in the project
     */
    normalize(): Promise<void>;
    /**
     * Find all source files in the project
     */
    private findSourceFiles;
    /**
     * Normalize imports in a single file
     */
    private normalizeFile;
    /**
     * Detect if an import path is "nested" (imports from a specific file in a folder)
     * Examples:
     *   "../Shared/BlockVisual" -> true (nested)
     *   "../Shared" -> false (already normalized)
     *   "./index" -> false (index file)
     */
    private isNestedImport;
    /**
     * Normalize an import path by removing the last segment
     * Example: "../Shared/BlockVisual" -> "../Shared"
     */
    private normalizeImportPath;
    /**
     * Create barrel files for all folders that need them
     * Iteration 2: Basic barrel file creation
     */
    private createBarrelFiles;
}
