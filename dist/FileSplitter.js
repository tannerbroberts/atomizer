"use strict";
const fs = require('fs');
const path = require('path');
const { parse } = require('@typescript-eslint/typescript-estree');
class FileSplitter {
    constructor(srcPath, options = {}) {
        this.srcPath = srcPath;
        this.options = options;
    }
    /**
     * Split files with multiple exported hooks/components into separate files
     * @param {Array} filesToSplit - Files that have multiple exports
     * @param {Map} newPaths - The computed new paths for all files
     * @returns {Object} - { splitOperations, updatedPaths, importRewrites }
     */
    computeSplits(filesToSplit, newPaths) {
        const splitOperations = [];
        const updatedPaths = new Map(newPaths);
        const importRewrites = new Map();
        for (const file of filesToSplit) {
            const result = this.splitFile(file, updatedPaths);
            splitOperations.push(...result.operations);
            for (const [exportName, newPath] of result.newPaths) {
                updatedPaths.set(`${file.filePath}#${exportName}`, newPath);
            }
            importRewrites.set(file.filePath, result.importRewrites);
        }
        return { splitOperations, updatedPaths, importRewrites };
    }
    /**
     * Split a single file into multiple files
     */
    splitFile(file, existingPaths) {
        const content = fs.readFileSync(file.filePath, 'utf-8');
        const ext = file.extension;
        const fileDir = path.dirname(existingPaths.get(file.filePath) || file.filePath);
        const operations = [];
        const newPaths = new Map();
        const importRewrites = {};
        const ast = parse(content, {
            jsx: ext === '.tsx' || ext === '.jsx',
            loc: true,
            range: true,
            tokens: false,
            comment: true,
        });
        const declarations = this.collectDeclarations(ast, content);
        const imports = this.collectImports(ast, content);
        const hooksToSplit = file.exportedHooks || [];
        const componentsToSplit = file.exportedComponents || [];
        const allToSplit = [...hooksToSplit, ...componentsToSplit];
        const sharedExports = file.exports.filter(e => !e.isHook && !e.isComponent);
        const exportPaths = new Map();
        for (const exp of allToSplit) {
            const isComponent = exp.isComponent;
            let newFilePath;
            if (isComponent) {
                newFilePath = path.join(fileDir, exp.name, `index${ext}`);
            }
            else {
                newFilePath = path.join(fileDir, `${exp.name}${ext}`);
            }
            exportPaths.set(exp.name, newFilePath);
            newPaths.set(exp.name, newFilePath);
        }
        for (const exp of allToSplit) {
            const decl = declarations.get(exp.name);
            if (!decl)
                continue;
            const newFilePath = exportPaths.get(exp.name);
            const deps = this.findDependencies(exp.name, declarations, content);
            const siblingDeps = [];
            for (const siblingExp of allToSplit) {
                if (siblingExp.name === exp.name)
                    continue;
                if (this.isIdentifierUsed(decl.code, siblingExp.name)) {
                    siblingDeps.push({
                        name: siblingExp.name,
                        path: exportPaths.get(siblingExp.name),
                    });
                }
            }
            const newContent = this.buildNewFileContent({
                exportName: exp.name,
                declaration: decl,
                dependencies: deps,
                imports,
                sharedExports,
                siblingDeps,
                newFilePath,
                originalFile: file,
                originalContent: content,
                isDefault: exp.isDefault,
                fileDir,
            });
            operations.push({
                type: 'create',
                filePath: newFilePath,
                content: newContent,
                exportName: exp.name,
                originalFile: file.filePath,
            });
            importRewrites[exp.name] = {
                oldPath: file.filePath,
                newPath: newFilePath,
                isDefault: exp.isDefault,
            };
        }
        if (sharedExports.length > 0) {
            const remainingContent = this.buildRemainingContent({
                originalContent: content,
                ast,
                removedExports: allToSplit.map(e => e.name),
                imports,
            });
            operations.push({
                type: 'update',
                filePath: file.filePath,
                content: remainingContent,
            });
        }
        else {
            operations.push({
                type: 'delete',
                filePath: file.filePath,
            });
        }
        return { operations, newPaths, importRewrites };
    }
    /**
     * Collect all top-level declarations from AST
     */
    collectDeclarations(ast, content) {
        const declarations = new Map();
        for (const node of ast.body) {
            if (node.type === 'FunctionDeclaration' && node.id?.name) {
                declarations.set(node.id.name, {
                    name: node.id.name,
                    type: 'function',
                    node,
                    code: content.slice(node.range[0], node.range[1]),
                    range: node.range,
                });
            }
            if (node.type === 'VariableDeclaration') {
                for (const decl of node.declarations) {
                    if (decl.id?.type === 'Identifier') {
                        declarations.set(decl.id.name, {
                            name: decl.id.name,
                            type: 'variable',
                            node,
                            declarator: decl,
                            code: content.slice(node.range[0], node.range[1]),
                            range: node.range,
                        });
                    }
                }
            }
            if (node.type === 'ClassDeclaration' && node.id?.name) {
                declarations.set(node.id.name, {
                    name: node.id.name,
                    type: 'class',
                    node,
                    code: content.slice(node.range[0], node.range[1]),
                    range: node.range,
                });
            }
            if (node.type === 'TSTypeAliasDeclaration' && node.id?.name) {
                declarations.set(node.id.name, {
                    name: node.id.name,
                    type: 'type',
                    node,
                    code: content.slice(node.range[0], node.range[1]),
                    range: node.range,
                });
            }
            if (node.type === 'TSInterfaceDeclaration' && node.id?.name) {
                declarations.set(node.id.name, {
                    name: node.id.name,
                    type: 'interface',
                    node,
                    code: content.slice(node.range[0], node.range[1]),
                    range: node.range,
                });
            }
            if (node.type === 'ExportNamedDeclaration' && node.declaration) {
                const decl = node.declaration;
                if (decl.type === 'FunctionDeclaration' && decl.id?.name) {
                    declarations.set(decl.id.name, {
                        name: decl.id.name,
                        type: 'function',
                        node: decl,
                        exportNode: node,
                        code: content.slice(decl.range[0], decl.range[1]),
                        exportCode: content.slice(node.range[0], node.range[1]),
                        range: decl.range,
                        exportRange: node.range,
                        isExported: true,
                    });
                }
                else if (decl.type === 'VariableDeclaration') {
                    for (const d of decl.declarations) {
                        if (d.id?.type === 'Identifier') {
                            declarations.set(d.id.name, {
                                name: d.id.name,
                                type: 'variable',
                                node: decl,
                                declarator: d,
                                exportNode: node,
                                code: content.slice(decl.range[0], decl.range[1]),
                                exportCode: content.slice(node.range[0], node.range[1]),
                                range: decl.range,
                                exportRange: node.range,
                                isExported: true,
                            });
                        }
                    }
                }
                else if (decl.type === 'ClassDeclaration' && decl.id?.name) {
                    declarations.set(decl.id.name, {
                        name: decl.id.name,
                        type: 'class',
                        node: decl,
                        exportNode: node,
                        code: content.slice(decl.range[0], decl.range[1]),
                        exportCode: content.slice(node.range[0], node.range[1]),
                        range: decl.range,
                        exportRange: node.range,
                        isExported: true,
                    });
                }
                else if (decl.type === 'TSTypeAliasDeclaration' && decl.id?.name) {
                    declarations.set(decl.id.name, {
                        name: decl.id.name,
                        type: 'type',
                        node: decl,
                        exportNode: node,
                        code: content.slice(decl.range[0], decl.range[1]),
                        exportCode: content.slice(node.range[0], node.range[1]),
                        range: decl.range,
                        exportRange: node.range,
                        isExported: true,
                    });
                }
                else if (decl.type === 'TSInterfaceDeclaration' && decl.id?.name) {
                    declarations.set(decl.id.name, {
                        name: decl.id.name,
                        type: 'interface',
                        node: decl,
                        exportNode: node,
                        code: content.slice(decl.range[0], decl.range[1]),
                        exportCode: content.slice(node.range[0], node.range[1]),
                        range: decl.range,
                        exportRange: node.range,
                        isExported: true,
                    });
                }
            }
            if (node.type === 'ExportDefaultDeclaration') {
                const decl = node.declaration;
                if (decl.type === 'FunctionDeclaration' && decl.id?.name) {
                    declarations.set(decl.id.name, {
                        name: decl.id.name,
                        type: 'function',
                        node: decl,
                        exportNode: node,
                        code: content.slice(decl.range[0], decl.range[1]),
                        exportCode: content.slice(node.range[0], node.range[1]),
                        range: decl.range,
                        exportRange: node.range,
                        isExported: true,
                        isDefault: true,
                    });
                }
                else if (decl.type === 'Identifier') {
                    const existing = declarations.get(decl.name);
                    if (existing) {
                        existing.isDefault = true;
                        existing.defaultExportNode = node;
                    }
                }
            }
        }
        return declarations;
    }
    /**
     * Collect all imports from AST
     */
    collectImports(ast, content) {
        const imports = [];
        for (const node of ast.body) {
            if (node.type === 'ImportDeclaration') {
                imports.push({
                    source: node.source.value,
                    code: content.slice(node.range[0], node.range[1]),
                    range: node.range,
                    specifiers: node.specifiers.map(s => ({
                        type: s.type,
                        local: s.local?.name,
                        imported: s.imported?.name || s.local?.name,
                    })),
                });
            }
        }
        return imports;
    }
    /**
     * Find what other declarations this export depends on
     */
    findDependencies(exportName, declarations, content) {
        const deps = new Set();
        const decl = declarations.get(exportName);
        if (!decl)
            return deps;
        const code = decl.code || '';
        for (const [name, otherDecl] of declarations) {
            if (name === exportName)
                continue;
            if (this.isIdentifierUsed(code, name)) {
                deps.add(name);
            }
        }
        return deps;
    }
    /**
     * Check if an identifier is actually used in code (not just in strings)
     */
    isIdentifierUsed(code, identifier) {
        const codeWithoutStrings = code
            .replace(/`[^`]*`/g, '""')
            .replace(/'[^']*'/g, '""')
            .replace(/"[^"]*"/g, '""')
            .replace(/\/\/.*$/gm, '')
            .replace(/\/\*[\s\S]*?\*\//g, '');
        const regex = new RegExp(`\\b${identifier}\\b`);
        return regex.test(codeWithoutStrings);
    }
    /**
     * Build content for a new split file
     */
    buildNewFileContent({ exportName, declaration, dependencies, imports, sharedExports, siblingDeps, newFilePath, originalFile, originalContent, isDefault, fileDir }) {
        const lines = [];
        const newFileDir = path.dirname(newFilePath);
        const neededImports = this.filterImports(imports, declaration.code, dependencies);
        for (const imp of neededImports) {
            lines.push(imp.code);
        }
        for (const sibling of siblingDeps || []) {
            let relativePath = path.relative(newFileDir, sibling.path);
            relativePath = relativePath.replace(/\.(tsx?|jsx?)$/, '').replace(/\/index$/, '');
            if (!relativePath.startsWith('.')) {
                relativePath = './' + relativePath;
            }
            lines.push(`import { ${sibling.name} } from '${relativePath}';`);
        }
        const usedShared = sharedExports.filter(e => {
            const regex = new RegExp(`\\b${e.name}\\b`);
            return regex.test(declaration.code);
        });
        if (usedShared.length > 0) {
            const originalNewPath = path.join(fileDir, 'index' + originalFile.extension);
            let relativePath = path.relative(newFileDir, path.dirname(originalNewPath));
            if (!relativePath || relativePath === '') {
                relativePath = '.';
            }
            else if (!relativePath.startsWith('.')) {
                relativePath = './' + relativePath;
            }
            const sharedNames = usedShared.map(e => e.name).join(', ');
            lines.push(`import { ${sharedNames} } from '${relativePath}';`);
        }
        if (lines.length > 0) {
            lines.push('');
        }
        if (declaration.isExported) {
            lines.push(declaration.exportCode);
        }
        else if (isDefault) {
            lines.push(declaration.code);
            lines.push(`\nexport default ${exportName};`);
        }
        else {
            lines.push(`export ${declaration.code}`);
        }
        return lines.join('\n') + '\n';
    }
    /**
     * Filter imports to only those needed by the given code
     */
    filterImports(imports, code, dependencies) {
        const needed = [];
        for (const imp of imports) {
            const usedSpecifiers = imp.specifiers.filter(s => {
                const regex = new RegExp(`\\b${s.local}\\b`);
                return regex.test(code);
            });
            if (usedSpecifiers.length > 0) {
                if (usedSpecifiers.length === imp.specifiers.length) {
                    needed.push(imp);
                }
                else {
                    const defaultSpec = usedSpecifiers.find(s => s.type === 'ImportDefaultSpecifier');
                    const namedSpecs = usedSpecifiers.filter(s => s.type === 'ImportSpecifier');
                    let importLine = 'import ';
                    if (defaultSpec) {
                        importLine += defaultSpec.local;
                        if (namedSpecs.length > 0) {
                            importLine += ', ';
                        }
                    }
                    if (namedSpecs.length > 0) {
                        importLine += '{ ' + namedSpecs.map(s => s.imported === s.local ? s.local : `${s.imported} as ${s.local}`).join(', ') + ' }';
                    }
                    importLine += ` from '${imp.source}';`;
                    needed.push({ ...imp, code: importLine });
                }
            }
        }
        return needed;
    }
    /**
     * Build content for the original file after splitting (remaining shared exports)
     */
    buildRemainingContent({ originalContent, ast, removedExports, imports }) {
        const lines = [];
        const removedSet = new Set(removedExports);
        for (const imp of imports) {
            lines.push(imp.code);
        }
        if (imports.length > 0) {
            lines.push('');
        }
        for (const node of ast.body) {
            if (node.type === 'ImportDeclaration')
                continue;
            let shouldKeep = true;
            let exportName = null;
            if (node.type === 'ExportNamedDeclaration' && node.declaration) {
                const decl = node.declaration;
                if (decl.type === 'FunctionDeclaration' && decl.id?.name) {
                    exportName = decl.id.name;
                }
                else if (decl.type === 'VariableDeclaration') {
                    for (const d of decl.declarations) {
                        if (d.id?.type === 'Identifier') {
                            exportName = d.id.name;
                            break;
                        }
                    }
                }
            }
            if (node.type === 'ExportDefaultDeclaration') {
                const decl = node.declaration;
                if (decl.type === 'FunctionDeclaration' && decl.id?.name) {
                    exportName = decl.id.name;
                }
                else if (decl.type === 'Identifier') {
                    exportName = decl.name;
                }
            }
            if (exportName && removedSet.has(exportName)) {
                shouldKeep = false;
            }
            if (shouldKeep) {
                lines.push(originalContent.slice(node.range[0], node.range[1]));
            }
        }
        return lines.join('\n\n') + '\n';
    }
    /**
     * Execute the split operations
     */
    async execute(splitOperations, outputPath) {
        for (const op of splitOperations) {
            if (op.type === 'create' || op.type === 'update') {
                const targetPath = outputPath ? op.filePath.replace(this.srcPath, outputPath) : op.filePath;
                const dir = path.dirname(targetPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                fs.writeFileSync(targetPath, op.content, 'utf-8');
                console.log(`  ${op.type === 'create' ? 'Created' : 'Updated'}: ${path.relative(outputPath || this.srcPath, targetPath)}`);
            }
        }
    }
}
module.exports = FileSplitter;
