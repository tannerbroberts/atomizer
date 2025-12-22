const fs = require('fs');
const path = require('path');
const { parse } = require('@typescript-eslint/typescript-estree');

class SymbolTracer {
  constructor(srcPath, analysisResults) {
    this.srcPath = srcPath;
    this.analysisResults = analysisResults;
    this.fileMap = new Map(analysisResults.map(f => [f.filePath, f]));
  }

  /**
   * Trace symbols in a file and find their consumers
   * @param {string} filePath - Absolute path to the file
   * @returns {Array} - List of symbols and their consumers
   */
  trace(filePath) {
    const file = this.fileMap.get(filePath);
    if (!file) {
      // If not in analysis results, we might need to analyze it first
      // For now, let's assume it's there
      throw new Error(`File not found in analysis: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const ext = path.extname(filePath);
    
    let ast;
    try {
      ast = parse(content, {
        jsx: ext === '.tsx' || ext === '.jsx',
        loc: true,
        range: true,
        tokens: false,
        comment: true,
      });
    } catch (e) {
      throw new Error(`Failed to parse ${filePath}: ${e.message}`);
    }

    // 1. Collect all top-level declarations
    const symbols = this.collectTopLevelSymbols(ast, content);

    // 2. Find internal consumers for each symbol
    for (const symbol of symbols) {
      symbol.internalConsumers = this.findInternalConsumers(symbol, symbols, content);
    }

    // 3. Find external consumers for each symbol
    for (const symbol of symbols) {
      if (symbol.isExported) {
        symbol.externalConsumers = this.findExternalConsumers(symbol, filePath);
      } else {
        symbol.externalConsumers = [];
      }
    }

    return symbols;
  }

  collectTopLevelSymbols(ast, content) {
    const symbols = [];

    // First pass: collect all declarations
    for (const node of ast.body) {
      let decl = node;
      let isExported = false;
      let isDefault = false;

      if (node.type === 'ExportNamedDeclaration' && node.declaration) {
        decl = node.declaration;
        isExported = true;
      } else if (node.type === 'ExportDefaultDeclaration') {
        decl = node.declaration;
        isExported = true;
        isDefault = true;
      }

      if (decl.type === 'FunctionDeclaration' && decl.id?.name) {
        symbols.push({
          name: decl.id.name,
          type: 'function',
          isExported,
          isDefault,
          range: decl.range,
          code: content.slice(decl.range[0], decl.range[1]),
        });
      } else if (decl.type === 'VariableDeclaration') {
        for (const d of decl.declarations) {
          if (d.id.type === 'Identifier') {
            symbols.push({
              name: d.id.name,
              type: 'variable',
              isExported,
              isDefault,
              range: d.range,
              code: content.slice(d.range[0], d.range[1]),
            });
          } else if (d.id.type === 'ObjectPattern') {
            for (const prop of d.id.properties) {
              if (prop.type === 'Property' && prop.value.type === 'Identifier') {
                symbols.push({
                  name: prop.value.name,
                  type: 'variable',
                  isExported,
                  isDefault,
                  range: d.range,
                  code: content.slice(d.range[0], d.range[1]),
                });
              }
            }
          }
        }
      } else if (decl.type === 'ClassDeclaration' && decl.id?.name) {
        symbols.push({
          name: decl.id.name,
          type: 'class',
          isExported,
          isDefault,
          range: decl.range,
          code: content.slice(decl.range[0], decl.range[1]),
        });
      } else if (decl.type === 'TSTypeAliasDeclaration' && decl.id?.name) {
        symbols.push({
          name: decl.id.name,
          type: 'type',
          isExported,
          isDefault,
          range: decl.range,
          code: content.slice(decl.range[0], decl.range[1]),
        });
      } else if (decl.type === 'TSInterfaceDeclaration' && decl.id?.name) {
        symbols.push({
          name: decl.id.name,
          type: 'interface',
          isExported,
          isDefault,
          range: decl.range,
          code: content.slice(decl.range[0], decl.range[1]),
        });
      } else if (isDefault && !decl.id) {
        symbols.push({
          name: 'default',
          type: 'anonymous',
          isExported: true,
          isDefault: true,
          range: decl.range,
          code: content.slice(decl.range[0], decl.range[1]),
        });
      }
    }

    // Second pass: handle re-exports and CommonJS exports
    for (const node of ast.body) {
      if (node.type === 'ExportNamedDeclaration' && node.specifiers) {
        for (const spec of node.specifiers) {
          const localName = spec.local?.name;
          const exportedName = spec.exported?.name || localName;
          
          const symbol = symbols.find(s => s.name === localName);
          if (symbol) {
            symbol.isExported = true;
          } else {
            symbols.push({
              name: exportedName,
              localName: localName,
              type: 'reexport',
              isExported: true,
              isDefault: false,
              range: spec.range,
            });
          }
        }
      }

      if (node.type === 'ExpressionStatement' && node.expression.type === 'AssignmentExpression') {
        const { left, right } = node.expression;
        
        // module.exports = ...
        if (left.type === 'MemberExpression' && 
            left.object.name === 'module' && 
            left.property.name === 'exports') {
          
          if (right.type === 'Identifier') {
            const symbol = symbols.find(s => s.name === right.name);
            if (symbol) {
              symbol.isExported = true;
              symbol.isDefault = true;
            }
          } else if (right.type === 'ObjectExpression') {
            for (const prop of right.properties) {
              if (prop.type === 'Property' && prop.key.type === 'Identifier' && prop.value.type === 'Identifier') {
                const symbol = symbols.find(s => s.name === prop.value.name);
                if (symbol) {
                  symbol.isExported = true;
                }
              }
            }
          }
        }
        
        // exports.foo = ...
        if (left.type === 'MemberExpression' && 
            left.object.name === 'exports') {
          if (right.type === 'Identifier') {
            const symbol = symbols.find(s => s.name === right.name);
            if (symbol) {
              symbol.isExported = true;
            }
          }
        }
      }
    }

    return symbols;
  }

  findInternalConsumers(symbol, allSymbols, content) {
    const consumers = new Set();
    const name = symbol.name;
    if (name === 'default') return [];

    // Check other symbols
    for (const other of allSymbols) {
      if (other === symbol) continue;
      if (!other.code) continue;

      if (this.isIdentifierUsed(other.code, name)) {
        consumers.add(other.name);
      }
    }

    // Check for top-level usages (outside of any symbol)
    // We'll do this by removing all symbol code from the content and checking what's left
    let remainingCode = content;
    
    // Sort symbols by range descending to avoid offset issues when removing
    const sortedSymbols = [...allSymbols].sort((a, b) => b.range[0] - a.range[0]);
    
    for (const s of sortedSymbols) {
      if (s.range) {
        remainingCode = remainingCode.slice(0, s.range[0]) + ' '.repeat(s.range[1] - s.range[0]) + remainingCode.slice(s.range[1]);
      }
    }

    if (this.isIdentifierUsed(remainingCode, name)) {
      consumers.add('<top-level>');
    }

    return Array.from(consumers);
  }

  findExternalConsumers(symbol, filePath) {
    const consumers = [];
    const name = symbol.name;

    for (const file of this.analysisResults) {
      if (file.filePath === filePath) continue;

      for (const imp of file.imports) {
        if (imp.resolvedPath === filePath) {
          let isImported = false;

          if (imp.specifiers.length > 0) {
            isImported = imp.specifiers.some(spec => {
              if (symbol.isDefault) {
                return spec.type === 'ImportDefaultSpecifier' || spec.imported === 'default';
              }
              return spec.imported === name || spec.local === name;
            });
          } else if (imp.isRequire || imp.isDynamic) {
            // For require() or dynamic import(), we assume it consumes the default export
            // or the whole module if it's a CommonJS module.
            if (symbol.isDefault) {
              isImported = true;
            }
          }

          if (isImported) {
            consumers.push(path.relative(this.srcPath, file.filePath));
            break;
          }
        }
      }
    }

    return consumers;
  }

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
}

module.exports = SymbolTracer;
