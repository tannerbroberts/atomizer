import { ProjectIndex } from './ProjectIndex';
import { DependencyTracer } from './DependencyTracer';
/**
 * Migrator - Replaces Migrator.js
 *
 * Uses ts-morph to update import paths safely without regex.
 * Migrates files to their new locations based on computed structure.
 */
export declare class Migrator {
    private srcPath;
    private outputPath;
    private index;
    private tracer;
    constructor(srcPath: string, outputPath: string, index: ProjectIndex, tracer: DependencyTracer);
    /**
     * Execute the migration
     */
    execute(newPaths: Map<string, string>): Promise<void>;
    /**
     * Update all import/export paths using ts-morph
     */
    private updateImports;
    /**
     * Calculate relative import path from one file to another
     */
    private calculateRelativePath;
    /**
     * Copy a file to new location
     */
    private copyFile;
    /**
     * Ensure directory exists
     */
    private ensureDir;
}
