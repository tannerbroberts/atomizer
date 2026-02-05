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
exports.ImportPathNormalizer = void 0;
const path = __importStar(require("path"));
const ts_morph_1 = require("ts-morph");
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
class ImportPathNormalizer {
    constructor(srcPath) {
        this.barrelFolders = new Set(); // Track folders that need barrel files
        this.srcPath = path.resolve(srcPath);
        this.project = new ts_morph_1.Project({
            tsConfigFilePath: this.findTsConfig(srcPath),
            skipAddingFilesFromTsConfig: true,
            compilerOptions: {
                allowJs: true,
                checkJs: false,
                noEmit: true,
                skipLibCheck: true,
            },
        });
    }
    findTsConfig(srcPath) {
        let searchDir = srcPath;
        for (let i = 0; i < 3; i++) {
            const tsconfigPath = path.join(searchDir, 'tsconfig.json');
            if (require('fs').existsSync(tsconfigPath)) {
                return tsconfigPath;
            }
            searchDir = path.dirname(searchDir);
        }
        return undefined;
    }
    /**
     * Normalize all imports in the project
     */
    async normalize() {
        // 1. Find all TypeScript/JavaScript files
        const files = this.findSourceFiles();
        // 2. Load them into the project
        for (const file of files) {
            this.project.addSourceFileAtPath(file);
        }
        // 3. Process each file
        for (const sourceFile of this.project.getSourceFiles()) {
            this.normalizeFile(sourceFile);
        }
        // 4. Create barrel files for folders that need them
        await this.createBarrelFiles();
        // 5. Save changes
        await this.project.save();
    }
    /**
     * Find all source files in the project
     */
    findSourceFiles() {
        const fs = require('fs');
        const files = [];
        const walk = (dir) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    // Skip node_modules
                    if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
                        walk(fullPath);
                    }
                }
                else if (entry.isFile()) {
                    if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
                        files.push(fullPath);
                    }
                }
            }
        };
        walk(this.srcPath);
        return files;
    }
    /**
     * Normalize imports in a single file
     */
    normalizeFile(sourceFile) {
        const imports = sourceFile.getImportDeclarations();
        const currentFileDir = path.dirname(sourceFile.getFilePath());
        for (const importDecl of imports) {
            const moduleSpecifier = importDecl.getModuleSpecifierValue();
            // Only process relative imports
            if (!moduleSpecifier.startsWith('.')) {
                continue;
            }
            // Skip CSS, asset, and other non-code imports
            if (/\.(css|scss|sass|less|png|jpg|jpeg|gif|svg|json|txt|md)$/i.test(moduleSpecifier)) {
                continue;
            }
            // Check if this looks like a nested import (ends with a component name)
            if (this.isNestedImport(moduleSpecifier)) {
                // Calculate original target folder (before normalization)
                const originalTargetFolder = path.resolve(currentFileDir, moduleSpecifier);
                const originalTargetParent = path.dirname(originalTargetFolder);
                const normalizedPath = this.normalizeImportPath(moduleSpecifier);
                // Don't rewrite if it would create a circular import (import from ".")
                if (normalizedPath === '.') {
                    continue;
                }
                // Don't rewrite if target folder has an index.tsx component file
                // (we only want to rewrite to folders that will have barrel files)
                const fs = require('fs');
                const targetHasComponent = ['.tsx', '.jsx'].some(ext => fs.existsSync(path.join(originalTargetParent, `index${ext}`)));
                if (targetHasComponent) {
                    // Target folder is a component folder, not a barrel folder
                    // Skip rewriting this import
                    continue;
                }
                if (normalizedPath !== moduleSpecifier) {
                    // The barrel file should go in the parent folder
                    // For example: if importing from "../Shared/BlockVisual"
                    // The barrel file goes in "../Shared"
                    this.barrelFolders.add(originalTargetParent);
                    // Rewrite the import
                    importDecl.setModuleSpecifier(normalizedPath);
                }
            }
        }
    }
    /**
     * Detect if an import path is "nested" (imports from a specific file in a folder)
     * Examples:
     *   "../Shared/BlockVisual" -> true (nested)
     *   "../Shared" -> false (already normalized)
     *   "./index" -> false (index file)
     */
    isNestedImport(importPath) {
        const parts = importPath.split('/');
        const lastPart = parts[parts.length - 1];
        // If last part looks like a component name (PascalCase or has extension)
        // and is not "index", consider it nested
        if (lastPart === 'index' || lastPart === '.' || lastPart === '..') {
            return false;
        }
        // Check if it looks like a component (starts with uppercase)
        // or has an extension (Component.tsx, utils.js, etc.)
        return /^[A-Z]/.test(lastPart) || /\.(ts|tsx|js|jsx)$/.test(lastPart);
    }
    /**
     * Normalize an import path by removing the last segment
     * Example: "../Shared/BlockVisual" -> "../Shared"
     */
    normalizeImportPath(importPath) {
        const parts = importPath.split('/');
        // Remove the last part (the component/file name)
        parts.pop();
        // Return the folder path
        return parts.join('/') || '.';
    }
    /**
     * Create barrel files for all folders that need them
     * Iteration 2: Basic barrel file creation
     */
    async createBarrelFiles() {
        const fs = require('fs');
        for (const folderPath of this.barrelFolders) {
            // Skip if folder doesn't exist
            if (!fs.existsSync(folderPath)) {
                continue;
            }
            // Skip if any index file already exists (ts, tsx, js, jsx)
            const hasIndex = ['.ts', '.tsx', '.js', '.jsx'].some(ext => fs.existsSync(path.join(folderPath, `index${ext}`)));
            if (hasIndex) {
                // Folder already has an index file, skip barrel creation
                continue;
            }
            const barrelPath = path.join(folderPath, 'index.ts');
            // Find all subfolders in this folder
            const entries = fs.readdirSync(folderPath, { withFileTypes: true });
            const exportStatements = [];
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const subfolderPath = path.join(folderPath, entry.name);
                    const subfolderIndex = path.join(subfolderPath, 'index.ts');
                    const subfolderIndexTsx = path.join(subfolderPath, 'index.tsx');
                    // Check if subfolder has an index file
                    if (fs.existsSync(subfolderIndex) || fs.existsSync(subfolderIndexTsx)) {
                        // Generate export statement
                        // For now, use wildcard export: export * from './SubFolder';
                        exportStatements.push(`export * from './${entry.name}';`);
                    }
                }
            }
            // Write barrel file
            if (exportStatements.length > 0) {
                const barrelContent = exportStatements.join('\n') + '\n';
                fs.writeFileSync(barrelPath, barrelContent, 'utf-8');
                console.log(`Created barrel file: ${barrelPath}`);
            }
        }
    }
}
exports.ImportPathNormalizer = ImportPathNormalizer;
