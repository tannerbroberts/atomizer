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
   * @param {Array} filesWithViolations - Files that have violations
   * @param {Map} newPaths - The computed new paths for all files
   * @returns {Object} - { splitOperations, updatedPaths, importRewrites }
   */
  computeSplits(filesWithViolations, newPaths) {
    const splitOperations = [];
    const updatedPaths = new Map(newPaths);
    const importRewrites = new Map();

    for (const file of filesWithViolations) {
      const result = this.splitFile(file, updatedPaths);
      splitOperations.push(...result.operations);
      
      // Update paths map with new split files
      for (const [exportName, newPath] of result.newPaths) {
        updatedPaths.set(`${file.filePath}#${exportName}`, newPath);
      }
      
      // Track import rewrites needed
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

    // Parse the file to get detailed AST
    const ast = parse(content, {
      jsx: ext === '.tsx' || ext === '.jsx',
      loc: true,
      range: true,
      tokens: false,
      comment: true,
    });

    // Collect all top-level declarations and their dependencies
    const declarations = this.collectDeclarations(ast, content);
    const imports = this.collectImports(ast, content);
    
    // Group exports by type
    const hooksToSplit = file.exportedHooks || [];
    const componentsToSplit = file.exportedComponents || [];
    const allToSplit = [...hooksToSplit, ...componentsToSplit];

    // Determine what stays in the original file (shared code)
    const sharedExports = file.exports.filter(e => 
      !e.isHook && !e.isComponent
    );

    // First pass: determine new file paths for all exports
    const exportPaths = new Map();
    for (const exp of allToSplit) {
      const isComponent = exp.isComponent;
      let newFilePath;
      if (isComponent) {
        newFilePath = path.join(fileDir, exp.name, `index${ext}`);
      } else {
        newFilePath = path.join(fileDir, `${exp.name}${ext}`);
      }
      exportPaths.set(exp.name, newFilePath);
      newPaths.set(exp.name, newFilePath);
    }

    // Second pass: create files with proper imports to sibling exports
    for (const exp of allToSplit) {
      const decl = declarations.get(exp.name);
      if (!decl) continue;

      const newFilePath = exportPaths.get(exp.name);

      // Find dependencies this export needs (including other split exports)
      const deps = this.findDependencies(exp.name, declarations, content);
      
      // Find which split exports this one depends on
      const siblingDeps = [];
      for (const siblingExp of allToSplit) {
        if (siblingExp.name === exp.name) continue;
        // Use the smarter identifier check that ignores strings
        if (this.isIdentifierUsed(decl.code, siblingExp.name)) {
          siblingDeps.push({
            name: siblingExp.name,
            path: exportPaths.get(siblingExp.name),
          });
        }
      }

      // Build the new file content
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
      
      // Track how imports should be rewritten
      importRewrites[exp.name] = {
        oldPath: file.filePath,
        newPath: newFilePath,
        isDefault: exp.isDefault,
      };
    }

    // Handle the original file - either delete it or keep shared exports
    if (sharedExports.length > 0) {
      // Keep the file but remove the split exports
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
    } else {
      // Delete the original file - it's now empty
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

      // Handle exported declarations
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
        } else if (decl.type === 'VariableDeclaration') {
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
        } else if (decl.type === 'ClassDeclaration' && decl.id?.name) {
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
        } else if (decl.type === 'TSTypeAliasDeclaration' && decl.id?.name) {
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
        } else if (decl.type === 'TSInterfaceDeclaration' && decl.id?.name) {
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

      // Handle default exports
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
        } else if (decl.type === 'Identifier') {
          // export default SomeIdentifier - link to existing declaration
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
    if (!decl) return deps;

    // Get the code for this declaration
    const code = decl.code || '';
    
    // Check what other declarations are referenced
    for (const [name, otherDecl] of declarations) {
      if (name === exportName) continue;
      
      // Check if the identifier is used outside of strings
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
    // Remove string literals and comments to avoid false positives
    const codeWithoutStrings = code
      .replace(/`[^`]*`/g, '""')  // template literals
      .replace(/'[^']*'/g, '""')  // single quoted strings
      .replace(/"[^"]*"/g, '""')  // double quoted strings  
      .replace(/\/\/.*$/gm, '')   // single line comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // multi-line comments
    
    const regex = new RegExp(`\\b${identifier}\\b`);
    return regex.test(codeWithoutStrings);
  }

  /**
   * Build content for a new split file
   */
  buildNewFileContent({ exportName, declaration, dependencies, imports, sharedExports, siblingDeps, newFilePath, originalFile, originalContent, isDefault, fileDir }) {
    const lines = [];
    const newFileDir = path.dirname(newFilePath);
    
    // Determine which imports are needed
    const neededImports = this.filterImports(imports, declaration.code, dependencies);
    
    // Add imports
    for (const imp of neededImports) {
      lines.push(imp.code);
    }

    // Add imports for sibling exports (other hooks/components from same file)
    for (const sibling of siblingDeps || []) {
      // Calculate relative path from new file to sibling file
      let relativePath = path.relative(newFileDir, sibling.path);
      // Remove extension and /index suffix
      relativePath = relativePath.replace(/\.(tsx?|jsx?)$/, '').replace(/\/index$/, '');
      if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
      }
      lines.push(`import { ${sibling.name} } from '${relativePath}';`);
    }

    // If there are shared exports in the original file that this export uses,
    // add an import for them
    const usedShared = sharedExports.filter(e => {
      const regex = new RegExp(`\\b${e.name}\\b`);
      return regex.test(declaration.code);
    });

    if (usedShared.length > 0) {
      // Calculate relative import path from new file to original file's new location
      // The original file will become fileDir/originalFile.name/index.ext or stay as fileDir/originalFile.name.ext
      const originalNewPath = path.join(fileDir, 'index' + originalFile.extension);
      let relativePath = path.relative(newFileDir, path.dirname(originalNewPath));
      if (!relativePath || relativePath === '') {
        relativePath = '.';
      } else if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
      }
      const sharedNames = usedShared.map(e => e.name).join(', ');
      lines.push(`import { ${sharedNames} } from '${relativePath}';`);
    }

    if (lines.length > 0) {
      lines.push('');
    }

    // Add the main declaration
    if (declaration.isExported) {
      // Already has export keyword
      lines.push(declaration.exportCode);
    } else if (isDefault) {
      lines.push(declaration.code);
      lines.push(`\nexport default ${exportName};`);
    } else {
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
      // Check if any specifier is used in the code
      const usedSpecifiers = imp.specifiers.filter(s => {
        const regex = new RegExp(`\\b${s.local}\\b`);
        return regex.test(code);
      });

      if (usedSpecifiers.length > 0) {
        if (usedSpecifiers.length === imp.specifiers.length) {
          // All specifiers used, keep entire import
          needed.push(imp);
        } else {
          // Rebuild import with only used specifiers
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
            importLine += '{ ' + namedSpecs.map(s => 
              s.imported === s.local ? s.local : `${s.imported} as ${s.local}`
            ).join(', ') + ' }';
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
    // For now, we'll rebuild the file without the removed exports
    // This is a simplified approach - a more robust solution would use
    // source code manipulation
    
    const lines = [];
    const removedSet = new Set(removedExports);
    
    // Keep all imports
    for (const imp of imports) {
      lines.push(imp.code);
    }
    
    if (imports.length > 0) {
      lines.push('');
    }

    // Process each top-level statement
    for (const node of ast.body) {
      if (node.type === 'ImportDeclaration') continue; // Already handled

      let shouldKeep = true;
      let exportName = null;

      if (node.type === 'ExportNamedDeclaration' && node.declaration) {
        const decl = node.declaration;
        if (decl.type === 'FunctionDeclaration' && decl.id?.name) {
          exportName = decl.id.name;
        } else if (decl.type === 'VariableDeclaration') {
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
        } else if (decl.type === 'Identifier') {
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
  async execute(splitOperations) {
    for (const op of splitOperations) {
      if (op.type === 'create') {
        // Ensure directory exists
        const dir = path.dirname(op.filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(op.filePath, op.content, 'utf-8');
        console.log(`  Created: ${path.relative(this.srcPath, op.filePath)}`);
      } else if (op.type === 'update') {
        fs.writeFileSync(op.filePath, op.content, 'utf-8');
        console.log(`  Updated: ${path.relative(this.srcPath, op.filePath)}`);
      } else if (op.type === 'delete') {
        if (fs.existsSync(op.filePath)) {
          fs.unlinkSync(op.filePath);
          console.log(`  Deleted: ${path.relative(this.srcPath, op.filePath)}`);
        }
      }
    }
  }
}

module.exports = FileSplitter;
