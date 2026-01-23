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
exports.Migrator = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Migrator - Replaces Migrator.js
 *
 * Uses ts-morph to update import paths safely without regex.
 * Migrates files to their new locations based on computed structure.
 */
class Migrator {
    constructor(srcPath, outputPath, index, tracer) {
        this.srcPath = path.resolve(srcPath);
        this.outputPath = path.resolve(outputPath);
        this.index = index;
        this.tracer = tracer;
    }
    /**
     * Execute the migration
     */
    async execute(newPaths) {
        console.log('\n📦 Executing migration...\n');
        console.log('Step 1: Creating directory structure...');
        await this.ensureDir(this.outputPath);
        const directories = new Set();
        for (const [_, newPath] of newPaths) {
            directories.add(path.dirname(newPath));
        }
        for (const dir of directories) {
            const targetDir = dir.replace(this.srcPath, this.outputPath);
            await this.ensureDir(targetDir);
        }
        console.log(`   ✓ Created ${directories.size} directories\n`);
        console.log('Step 2: Updating import paths...');
        await this.updateImports(newPaths);
        console.log('   ✓ Import paths updated\n');
        console.log('Step 3: Copying files...');
        let copiedCount = 0;
        for (const [oldPath, newPath] of newPaths) {
            if (!fs.existsSync(oldPath))
                continue;
            const targetPath = newPath.replace(this.srcPath, this.outputPath);
            await this.copyFile(oldPath, targetPath);
            if (oldPath !== newPath) {
                const relativeOld = path.relative(this.srcPath, oldPath);
                const relativeNew = path.relative(this.srcPath, newPath);
                console.log(`  ${relativeOld} → ${relativeNew}`);
            }
            copiedCount++;
        }
        console.log(`\n✓ Migration complete! Copied ${copiedCount} files to ${this.outputPath}`);
        console.log('\nStep 4: Saving updated files...');
        await this.index.getProject().save();
        console.log('   ✓ All files saved\n');
    }
    /**
     * Update all import/export paths using ts-morph
     */
    async updateImports(newPaths) {
        for (const [oldPath, newPath] of newPaths) {
            const sourceFile = this.index.getSourceFile(oldPath);
            if (!sourceFile)
                continue;
            const importDecls = sourceFile.getImportDeclarations();
            for (const importDecl of importDecls) {
                const resolvedFile = importDecl.getModuleSpecifierSourceFile();
                if (!resolvedFile)
                    continue;
                const oldImportPath = resolvedFile.getFilePath();
                const newImportPath = newPaths.get(oldImportPath);
                if (newImportPath) {
                    const relativePath = this.calculateRelativePath(newPath, newImportPath);
                    importDecl.setModuleSpecifier(relativePath);
                }
            }
            const exportDecls = sourceFile.getExportDeclarations();
            for (const exportDecl of exportDecls) {
                const moduleSpecifier = exportDecl.getModuleSpecifierValue();
                if (!moduleSpecifier)
                    continue;
                const resolvedFile = exportDecl.getModuleSpecifierSourceFile();
                if (!resolvedFile)
                    continue;
                const oldExportPath = resolvedFile.getFilePath();
                const newExportPath = newPaths.get(oldExportPath);
                if (newExportPath) {
                    const relativePath = this.calculateRelativePath(newPath, newExportPath);
                    exportDecl.setModuleSpecifier(relativePath);
                }
            }
        }
    }
    /**
     * Calculate relative import path from one file to another
     */
    calculateRelativePath(fromPath, toPath) {
        const fromDir = path.dirname(fromPath);
        let relative = path.relative(fromDir, toPath);
        relative = relative.replace(/\.(tsx?|jsx?)$/, '');
        relative = relative.replace(/\/index$/, '');
        if (relative === '' || relative === 'index') {
            relative = '.';
        }
        if (!relative.startsWith('.') && !relative.startsWith('/')) {
            relative = './' + relative;
        }
        return relative;
    }
    /**
     * Copy a file to new location
     */
    async copyFile(fromPath, toPath) {
        await this.ensureDir(path.dirname(toPath));
        const content = fs.readFileSync(fromPath, 'utf-8');
        fs.writeFileSync(toPath, content, 'utf-8');
    }
    /**
     * Ensure directory exists
     */
    async ensureDir(dir) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
}
exports.Migrator = Migrator;
