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
exports.ProjectIndex = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ts_morph_1 = require("ts-morph");
/**
 * ProjectIndex - Replaces ProjectIndexer.js
 *
 * Uses ts-morph to load and index a TypeScript/JavaScript project.
 * Provides type-safe access to declarations, imports, and exports.
 */
class ProjectIndex {
    constructor(srcPath, options = {}) {
        this.declarations = new Map();
        this.imports = new Map();
        this.exports = new Map();
        this.sourceFiles = [];
        this.srcPath = path.resolve(srcPath);
        const tsConfigPath = this.findTsConfig(this.srcPath);
        this.project = new ts_morph_1.Project({
            tsConfigFilePath: tsConfigPath,
            skipAddingFilesFromTsConfig: true,
            compilerOptions: {
                allowJs: true,
                checkJs: false,
                jsx: ts_morph_1.ts.JsxEmit.React,
                noEmit: true,
                skipLibCheck: true,
            },
        });
    }
    /**
     * Find tsconfig.json or jsconfig.json
     */
    findTsConfig(srcPath) {
        let searchDir = srcPath;
        for (let i = 0; i < 3; i++) {
            const tsconfigPath = path.join(searchDir, 'tsconfig.json');
            const jsconfigPath = path.join(searchDir, 'jsconfig.json');
            if (fs.existsSync(tsconfigPath)) {
                return tsconfigPath;
            }
            else if (fs.existsSync(jsconfigPath)) {
                return jsconfigPath;
            }
            searchDir = path.dirname(searchDir);
        }
        return undefined;
    }
    /**
     * Load and index all source files
     */
    async indexAll(files) {
        const codeFiles = files.filter(f => ['.js', '.jsx', '.ts', '.tsx'].includes(f.extension));
        for (const file of codeFiles) {
            try {
                const sourceFile = this.project.addSourceFileAtPath(file.absolutePath);
                this.sourceFiles.push(sourceFile);
                this.indexFile(sourceFile, file.relativePath);
            }
            catch (error) {
                console.error(`Failed to index ${file.absolutePath}: ${error.message}`);
            }
        }
    }
    /**
     * Index a single source file
     */
    indexFile(sourceFile, relativePath) {
        const filePath = sourceFile.getFilePath();
        this.indexDeclarations(sourceFile, filePath, relativePath);
        this.indexImports(sourceFile, filePath, relativePath);
        this.indexExports(sourceFile, filePath, relativePath);
    }
    /**
     * Index all declarations in a file
     */
    indexDeclarations(sourceFile, filePath, relativePath) {
        const declarations = [
            ...sourceFile.getVariableDeclarations(),
            ...sourceFile.getFunctions(),
            ...sourceFile.getClasses(),
            ...sourceFile.getInterfaces(),
            ...sourceFile.getTypeAliases(),
            ...sourceFile.getEnums(),
        ];
        // Also index class methods
        const classes = sourceFile.getClasses();
        for (const classDecl of classes) {
            const methods = classDecl.getMethods();
            for (const method of methods) {
                const methodName = method.getName();
                const methodInfo = {
                    node: method,
                    name: methodName,
                    isExported: false, // Methods are not directly exported
                    kind: method.getKind(),
                    filePath,
                    relativePath,
                };
                this.declarations.set(method, methodInfo);
            }
        }
        for (const decl of declarations) {
            const symbol = decl.getSymbol();
            let name = symbol?.getName() || 'anonymous';
            // Check if this declaration is exported
            // For variable declarations, check the parent VariableStatement's modifiers
            let isExported = false;
            if (ts_morph_1.Node.isVariableDeclaration(decl)) {
                const varStatement = decl.getVariableStatement();
                if (varStatement) {
                    isExported = varStatement.isExported();
                }
            }
            else if (ts_morph_1.Node.isExportable(decl)) {
                isExported = decl.isExported();
            }
            // Handle default exports (both anonymous and named with 'default' modifier)
            if (isExported) {
                // Check if this is a default export by looking at the declaration's modifiers
                let isDefaultExport = false;
                if (ts_morph_1.Node.isFunctionDeclaration(decl) || ts_morph_1.Node.isClassDeclaration(decl)) {
                    // For function/class declarations, check if they have default export modifier
                    const modifiers = decl.getModifiers();
                    isDefaultExport = modifiers.some(mod => mod.getText() === 'default');
                }
                else {
                    // For other nodes, check parent or symbol name
                    const parent = decl.getParent();
                    isDefaultExport = ts_morph_1.Node.isExportAssignment(parent) || name === 'default';
                }
                if (isDefaultExport || name === 'anonymous' || name === 'default') {
                    if (isDefaultExport) {
                        // Try to get the actual name for named defaults (e.g., export default function Button() {})
                        if (ts_morph_1.Node.isFunctionDeclaration(decl)) {
                            const funcName = decl.getName();
                            if (funcName && funcName !== 'default') {
                                name = funcName;
                            }
                            else {
                                const fileName = path.basename(filePath, path.extname(filePath));
                                name = `DEFAULT_${fileName}`;
                            }
                        }
                        else if (ts_morph_1.Node.isClassDeclaration(decl)) {
                            const className = decl.getName();
                            if (className && className !== 'default') {
                                name = className;
                            }
                            else {
                                const fileName = path.basename(filePath, path.extname(filePath));
                                name = `DEFAULT_${fileName}`;
                            }
                        }
                        else {
                            // For other anonymous defaults
                            const fileName = path.basename(filePath, path.extname(filePath));
                            name = `DEFAULT_${fileName}`;
                        }
                    }
                }
            }
            const info = {
                node: decl,
                name,
                isExported,
                kind: decl.getKind(),
                filePath,
                relativePath,
            };
            this.declarations.set(decl, info);
        }
    }
    /**
     * Index all imports in a file
     */
    indexImports(sourceFile, filePath, relativePath) {
        const importDecls = sourceFile.getImportDeclarations();
        for (const importDecl of importDecls) {
            const source = importDecl.getModuleSpecifierValue();
            const resolvedFile = importDecl.getModuleSpecifierSourceFile();
            const resolvedPath = resolvedFile?.getFilePath() || null;
            const importedNames = [];
            const defaultImport = importDecl.getDefaultImport();
            if (defaultImport) {
                importedNames.push({
                    local: defaultImport.getText(),
                    imported: 'default',
                });
            }
            const namespaceImport = importDecl.getNamespaceImport();
            if (namespaceImport) {
                importedNames.push({
                    local: namespaceImport.getText(),
                    imported: '*',
                });
            }
            const namedImports = importDecl.getNamedImports();
            for (const namedImport of namedImports) {
                const local = namedImport.getName();
                const imported = namedImport.getAliasNode()?.getText() || local;
                importedNames.push({ local, imported });
            }
            const info = {
                node: importDecl,
                importedNames,
                source,
                resolvedPath,
                filePath,
                relativePath,
            };
            this.imports.set(importDecl, info);
        }
    }
    /**
     * Index all exports in a file
     */
    indexExports(sourceFile, filePath, relativePath) {
        // First, create export entries for declarations that are directly exported
        // (e.g., export const X = ..., export function foo() {}, export default function bar() {})
        for (const [node, declInfo] of this.declarations) {
            if (declInfo.filePath === filePath && declInfo.isExported) {
                // Check if this is a default export
                let isDefaultExport = false;
                if (ts_morph_1.Node.isFunctionDeclaration(node) || ts_morph_1.Node.isClassDeclaration(node)) {
                    const modifiers = node.getModifiers();
                    isDefaultExport = modifiers.some(mod => mod.getText() === 'default');
                }
                const exportedNames = [
                    {
                        local: declInfo.name,
                        exported: isDefaultExport ? 'default' : declInfo.name
                    }
                ];
                const info = {
                    node: node,
                    exportedNames,
                    source: null,
                    resolvedPath: null,
                    isReExport: false,
                    filePath,
                    relativePath,
                };
                this.exports.set(node, info);
            }
        }
        const exportDecls = sourceFile.getExportDeclarations();
        for (const exportDecl of exportDecls) {
            const source = exportDecl.getModuleSpecifierValue() || null;
            const resolvedFile = exportDecl.getModuleSpecifierSourceFile();
            const resolvedPath = resolvedFile?.getFilePath() || null;
            const isReExport = source !== null;
            const exportedNames = [];
            const namedExports = exportDecl.getNamedExports();
            for (const namedExport of namedExports) {
                const exported = namedExport.getName();
                const local = namedExport.getAliasNode()?.getText() || exported;
                exportedNames.push({ local, exported });
            }
            if (exportDecl.isNamespaceExport()) {
                exportedNames.push({ local: '*', exported: '*' });
            }
            const info = {
                node: exportDecl,
                exportedNames,
                source,
                resolvedPath,
                isReExport,
                filePath,
                relativePath,
            };
            this.exports.set(exportDecl, info);
        }
        const exportAssignments = sourceFile.getExportAssignments();
        for (const exportAssignment of exportAssignments) {
            const isDefault = exportAssignment.isExportEquals() === false;
            // For default exports, prefer the actual name if it exists, otherwise use DEFAULT_[fileName]
            let localName;
            let needsDeclaration = false; // Track if we need to create a declaration
            if (isDefault) {
                const expression = exportAssignment.getExpression();
                // Try to get the name from the expression
                let expressionName;
                if (ts_morph_1.Node.isFunctionExpression(expression) || ts_morph_1.Node.isArrowFunction(expression)) {
                    // For function expressions, try to get the name
                    const symbol = expression.getSymbol();
                    expressionName = symbol?.getName();
                    needsDeclaration = true; // Arrow/function expressions need declarations
                }
                else if (ts_morph_1.Node.isClassExpression(expression)) {
                    // For class expressions, try to get the name
                    const symbol = expression.getSymbol();
                    expressionName = symbol?.getName();
                    needsDeclaration = true;
                }
                else if (ts_morph_1.Node.isObjectLiteralExpression(expression)) {
                    // Object literals are anonymous
                    needsDeclaration = true;
                }
                else if (ts_morph_1.Node.isIdentifier(expression)) {
                    // For identifiers (const X = ...; export default X;), use the identifier name
                    expressionName = expression.getText();
                    // No need for declaration - it references an existing one
                    // But we need to mark the referenced declaration as exported
                    const referencedSymbol = expression.getSymbol();
                    if (referencedSymbol) {
                        const declarations = referencedSymbol.getDeclarations();
                        for (const referencedDecl of declarations) {
                            // Find this declaration in our map and mark it as exported
                            const existing = this.declarations.get(referencedDecl);
                            if (existing) {
                                existing.isExported = true;
                            }
                        }
                    }
                }
                // If we got a valid name and it's not 'anonymous' or '__function', use it
                if (expressionName && expressionName !== 'anonymous' && !expressionName.startsWith('__')) {
                    localName = expressionName;
                }
                else {
                    // Fall back to DEFAULT_[fileName] for anonymous expressions
                    const fileName = path.basename(filePath, path.extname(filePath));
                    localName = `DEFAULT_${fileName}`;
                }
                // Create a declaration for anonymous expressions
                if (needsDeclaration) {
                    const declInfo = {
                        node: expression,
                        name: localName,
                        isExported: true,
                        kind: expression.getKind(),
                        filePath,
                        relativePath,
                    };
                    this.declarations.set(expression, declInfo);
                    // Also create an export entry for this declaration
                    // (since it's created after the declarations loop in indexExports runs)
                    const declExportInfo = {
                        node: expression,
                        exportedNames: [{ local: localName, exported: 'default' }],
                        source: null,
                        resolvedPath: null,
                        isReExport: false,
                        filePath,
                        relativePath,
                    };
                    this.exports.set(expression, declExportInfo);
                }
            }
            else {
                localName = exportAssignment.getExpression().getText();
            }
            // Only create export entry for the assignment if we didn't already create one
            // for the expression (in the needsDeclaration case above)
            if (!needsDeclaration) {
                const exportedNames = [
                    { local: localName, exported: isDefault ? 'default' : '=' }
                ];
                const info = {
                    node: exportAssignment,
                    exportedNames,
                    source: null,
                    resolvedPath: null,
                    isReExport: false,
                    filePath,
                    relativePath,
                };
                this.exports.set(exportAssignment, info);
            }
        }
    }
    /**
     * Get statistics about indexed nodes
     */
    getStats() {
        return {
            totalNodes: this.declarations.size + this.imports.size + this.exports.size,
            importNodes: this.imports.size,
            exportNodes: this.exports.size,
            declarationNodes: this.declarations.size,
        };
    }
    /**
     * Get all declarations
     */
    getDeclarations() {
        return this.declarations;
    }
    /**
     * Get all imports
     */
    getImports() {
        return this.imports;
    }
    /**
     * Get all exports
     */
    getExports() {
        return this.exports;
    }
    /**
     * Get the ts-morph Project instance
     */
    getProject() {
        return this.project;
    }
    /**
     * Get all source files
     */
    getSourceFiles() {
        return this.sourceFiles;
    }
    /**
     * Get a source file by path
     */
    getSourceFile(filePath) {
        return this.project.getSourceFile(filePath);
    }
}
exports.ProjectIndex = ProjectIndex;
