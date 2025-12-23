const fs = require('fs');
const path = require('path');
const { parse } = require('@typescript-eslint/typescript-estree');
const { v4: uuidv4 } = require('uuid');

/**
 * ProjectIndexer - Phase 1 of the Atomizer pipeline
 * 
 * Crawls the src directory, parsing every .js, .jsx, .ts, and .tsx file.
 * For every top-level node in the AST representation of a file:
 *   - Adds a uuid-key to the project map with that node as an object
 *   - Adds a custom property 'filePath' (absolute path to source file)
 * 
 * Maintains 4 separate maps referencing the same objects by UUID:
 *   - project: All top-level nodes
 *   - imports: Import declaration nodes
 *   - exports: Export declaration nodes  
 *   - declarations: Variable/function/class/type declarations
 */
class ProjectIndexer {
  constructor(srcPath, options = {}) {
    this.srcPath = path.resolve(srcPath);
    this.options = options;
    
    // The four main maps as described in README
    this.project = new Map();      // uuid -> node object
    this.imports = new Map();      // uuid -> node object (import nodes only)
    this.exports = new Map();      // uuid -> node object (export nodes only)
    this.declarations = new Map(); // uuid -> node object (declaration nodes only)
    
    // Load path aliases from tsconfig/jsconfig
    const { aliasMap, baseUrl } = this.loadAliases();
    this.aliasMap = aliasMap;
    this.baseUrl = baseUrl;
  }

  loadAliases() {
    let configPath = null;
    let searchDir = this.srcPath;
    
    for (let i = 0; i < 3; i++) {
      const tsconfigPath = path.join(searchDir, 'tsconfig.json');
      const jsconfigPath = path.join(searchDir, 'jsconfig.json');
      
      if (fs.existsSync(tsconfigPath)) {
        configPath = tsconfigPath;
        break;
      } else if (fs.existsSync(jsconfigPath)) {
        configPath = jsconfigPath;
        break;
      }
      searchDir = path.dirname(searchDir);
    }
    
    let config = null;
    let configDir = this.srcPath;
    
    if (configPath) {
      try {
        const content = fs.readFileSync(configPath, 'utf-8');
        config = JSON.parse(content);
        configDir = path.dirname(configPath);
      } catch (e) {
        // Ignore parse errors
      }
    }

    const aliases = {};
    let baseUrl = null;
    
    if (config?.compilerOptions?.baseUrl) {
      baseUrl = path.resolve(configDir, config.compilerOptions.baseUrl);
    }
    
    if (config?.compilerOptions?.paths) {
      const pathsBaseUrl = baseUrl || configDir;
      const paths = config.compilerOptions.paths;
      
      for (const [alias, targets] of Object.entries(paths)) {
        const aliasPattern = alias.replace('*', '(.*)');
        const targetPattern = targets[0]?.replace('*', '$1') || '';
        aliases[aliasPattern] = path.join(pathsBaseUrl, targetPattern);
      }
    }

    return { aliasMap: aliases, baseUrl };
  }

  /**
   * Index all source files in the project
   * @returns {Object} - { project, imports, exports, declarations }
   */
  async indexAll(files) {
    const codeFiles = files.filter(f => 
      ['.js', '.jsx', '.ts', '.tsx'].includes(f.extension)
    );

    for (const file of codeFiles) {
      try {
        await this.indexFile(file);
      } catch (error) {
        if (this.options.verbose) {
          console.error(`Failed to parse ${file.absolutePath}: ${error.message}`);
        }
      }
    }

    return {
      project: this.project,
      imports: this.imports,
      exports: this.exports,
      declarations: this.declarations,
    };
  }

  /**
   * Index a single file's top-level AST nodes
   */
  async indexFile(file) {
    const content = fs.readFileSync(file.absolutePath, 'utf-8');
    const enableJsx = file.extension === '.tsx' || file.extension === '.jsx';
    
    const ast = parse(content, {
      jsx: enableJsx,
      loc: true,
      range: true,
      tokens: false,
      comment: false,
      errorOnUnknownASTType: false,
    });

    // Process each top-level node in the AST body
    for (const node of ast.body) {
      const uuid = uuidv4();
      
      // Create an enriched node object with filePath property
      const enrichedNode = {
        uuid,
        filePath: file.absolutePath,
        relativePath: file.relativePath,
        nodeType: node.type,
        range: node.range,
        loc: node.loc,
        raw: content.slice(node.range[0], node.range[1]),
        ...this.extractNodeDetails(node, content),
      };

      // Add to project map (all nodes go here)
      this.project.set(uuid, enrichedNode);

      // Categorize into appropriate specialized maps
      this.categorizeNode(uuid, enrichedNode, node);
    }
  }

  /**
   * Extract detailed information from a node based on its type
   */
  extractNodeDetails(node, content) {
    const details = {
      names: [],           // All names declared/exported/imported by this node
      isExported: false,
      isDefaultExport: false,
      exportedNames: [],
      importedNames: [],
      declaredNames: [],
      importSource: null,
      exportSource: null,  // For re-exports
    };

    switch (node.type) {
      case 'ImportDeclaration':
        details.importSource = node.source.value;
        details.importedNames = this.extractImportSpecifiers(node);
        details.names = details.importedNames.map(s => s.local);
        break;

      case 'ExportNamedDeclaration':
        details.isExported = true;
        if (node.source) {
          // Re-export: export { x } from './module'
          details.exportSource = node.source.value;
          details.exportedNames = this.extractExportSpecifiers(node);
          details.names = details.exportedNames.map(s => s.exported);
        } else if (node.declaration) {
          // Export with declaration: export const x = ...
          const declared = this.extractDeclarationNames(node.declaration);
          details.declaredNames = declared;
          details.exportedNames = declared.map(name => ({ local: name, exported: name }));
          details.names = declared;
        } else if (node.specifiers) {
          // Export existing: export { x, y }
          details.exportedNames = this.extractExportSpecifiers(node);
          details.names = details.exportedNames.map(s => s.exported);
        }
        break;

      case 'ExportDefaultDeclaration':
        details.isExported = true;
        details.isDefaultExport = true;
        details.exportedNames = [{ local: this.getDefaultExportName(node), exported: 'default' }];
        details.names = ['default'];
        if (node.declaration) {
          const declared = this.extractDeclarationNames(node.declaration);
          if (declared.length > 0) {
            details.declaredNames = declared;
            details.names = [...details.names, ...declared];
          }
        }
        break;

      case 'ExportAllDeclaration':
        details.isExported = true;
        details.exportSource = node.source.value;
        details.exportedNames = [{ local: '*', exported: node.exported?.name || '*' }];
        details.names = ['*'];
        break;

      case 'VariableDeclaration':
        details.declaredNames = this.extractDeclarationNames(node);
        details.names = details.declaredNames;
        // Check if this is a require() import
        for (const declarator of node.declarations) {
          const requireSource = this.extractRequireSource(declarator.init);
          if (requireSource) {
            details.importSource = requireSource;
            details.isRequireImport = true;
            // Build import specifiers from the variable pattern
            const names = this.extractPatternNames(declarator.id);
            if (declarator.id.type === 'Identifier') {
              // const x = require('./x') - default-like import
              details.importedNames.push({
                type: 'require-default',
                local: declarator.id.name,
                imported: 'default',
              });
            } else if (declarator.id.type === 'ObjectPattern') {
              // const { a, b } = require('./x') - named imports
              for (const prop of declarator.id.properties) {
                if (prop.type === 'Property' && prop.key?.name) {
                  const local = prop.value?.name || prop.key.name;
                  const imported = prop.key.name;
                  details.importedNames.push({
                    type: 'require-named',
                    local,
                    imported,
                  });
                }
              }
            }
          }
        }
        break;

      case 'FunctionDeclaration':
        if (node.id?.name) {
          details.declaredNames = [node.id.name];
          details.names = [node.id.name];
        }
        break;

      case 'ClassDeclaration':
        if (node.id?.name) {
          details.declaredNames = [node.id.name];
          details.names = [node.id.name];
        }
        break;

      case 'TSTypeAliasDeclaration':
        if (node.id?.name) {
          details.declaredNames = [node.id.name];
          details.names = [node.id.name];
        }
        break;

      case 'TSInterfaceDeclaration':
        if (node.id?.name) {
          details.declaredNames = [node.id.name];
          details.names = [node.id.name];
        }
        break;

      case 'TSEnumDeclaration':
        if (node.id?.name) {
          details.declaredNames = [node.id.name];
          details.names = [node.id.name];
        }
        break;

      case 'TSModuleDeclaration':
        if (node.id?.name) {
          details.declaredNames = [node.id.name];
          details.names = [node.id.name];
        }
        break;

      case 'ExpressionStatement': {
        // Handle CommonJS exports: module.exports = X or exports.X = Y
        const expr = node.expression;
        if (expr?.type === 'AssignmentExpression') {
          const left = expr.left;
          const right = expr.right;
          
          // module.exports = X
          if (left?.type === 'MemberExpression' &&
              left.object?.name === 'module' &&
              left.property?.name === 'exports') {
            details.isExported = true;
            details.isDefaultExport = true;
            
            if (right?.type === 'Identifier') {
              // module.exports = SomeClass
              details.exportedNames = [{ local: right.name, exported: 'default' }];
              details.names = [right.name, 'default'];
            } else if (right?.type === 'ObjectExpression') {
              // module.exports = { a, b, c }
              for (const prop of right.properties || []) {
                if (prop.type === 'Property' && prop.key?.name) {
                  const exported = prop.key.name;
                  const local = prop.value?.name || exported;
                  details.exportedNames.push({ local, exported });
                  details.names.push(exported);
                }
              }
            } else {
              // Anonymous export
              details.exportedNames = [{ local: 'default', exported: 'default' }];
              details.names = ['default'];
            }
          }
          
          // exports.X = Y
          if (left?.type === 'MemberExpression' &&
              left.object?.name === 'exports' &&
              left.property?.name) {
            details.isExported = true;
            const exported = left.property.name;
            const local = right?.name || exported;
            details.exportedNames = [{ local, exported }];
            details.names = [exported];
          }
        }
        break;
      }
    }

    return details;
  }

  /**
   * Extract import specifiers with local and imported names
   */
  extractImportSpecifiers(node) {
    const specifiers = [];
    
    for (const spec of node.specifiers || []) {
      if (spec.type === 'ImportDefaultSpecifier') {
        specifiers.push({
          type: 'default',
          local: spec.local.name,
          imported: 'default',
        });
      } else if (spec.type === 'ImportNamespaceSpecifier') {
        specifiers.push({
          type: 'namespace',
          local: spec.local.name,
          imported: '*',
        });
      } else if (spec.type === 'ImportSpecifier') {
        specifiers.push({
          type: 'named',
          local: spec.local.name,
          imported: spec.imported.name,
        });
      }
    }
    
    return specifiers;
  }

  /**
   * Extract export specifiers with local and exported names
   */
  extractExportSpecifiers(node) {
    const specifiers = [];
    
    for (const spec of node.specifiers || []) {
      specifiers.push({
        local: spec.local.name,
        exported: spec.exported.name,
      });
    }
    
    return specifiers;
  }

  /**
   * Extract names from a declaration node
   */
  extractDeclarationNames(node) {
    const names = [];
    
    if (!node) return names;

    switch (node.type) {
      case 'VariableDeclaration':
        for (const declarator of node.declarations) {
          names.push(...this.extractPatternNames(declarator.id));
        }
        break;

      case 'FunctionDeclaration':
      case 'ClassDeclaration':
      case 'TSTypeAliasDeclaration':
      case 'TSInterfaceDeclaration':
      case 'TSEnumDeclaration':
        if (node.id?.name) {
          names.push(node.id.name);
        }
        break;

      case 'Identifier':
        names.push(node.name);
        break;
    }

    return names;
  }

  /**
   * Extract names from a pattern (handles destructuring)
   */
  extractPatternNames(pattern) {
    const names = [];
    
    if (!pattern) return names;

    switch (pattern.type) {
      case 'Identifier':
        names.push(pattern.name);
        break;

      case 'ObjectPattern':
        for (const prop of pattern.properties) {
          if (prop.type === 'Property') {
            names.push(...this.extractPatternNames(prop.value));
          } else if (prop.type === 'RestElement') {
            names.push(...this.extractPatternNames(prop.argument));
          }
        }
        break;

      case 'ArrayPattern':
        for (const element of pattern.elements) {
          if (element) {
            names.push(...this.extractPatternNames(element));
          }
        }
        break;

      case 'RestElement':
        names.push(...this.extractPatternNames(pattern.argument));
        break;

      case 'AssignmentPattern':
        names.push(...this.extractPatternNames(pattern.left));
        break;
    }

    return names;
  }

  /**
   * Extract the source from a require() call expression
   * Returns null if not a require() call
   */
  extractRequireSource(node) {
    if (!node) return null;
    
    // Direct require: require('./x')
    if (node.type === 'CallExpression' && 
        node.callee?.name === 'require' &&
        node.arguments?.[0]?.type === 'Literal') {
      return node.arguments[0].value;
    }
    
    // Member access on require: require('./x').something
    if (node.type === 'MemberExpression' &&
        node.object?.type === 'CallExpression' &&
        node.object?.callee?.name === 'require' &&
        node.object?.arguments?.[0]?.type === 'Literal') {
      return node.object.arguments[0].value;
    }
    
    return null;
  }

  /**
   * Get the name of a default export
   */
  getDefaultExportName(node) {
    const decl = node.declaration;
    if (!decl) return 'default';
    
    if (decl.id?.name) {
      return decl.id.name;
    }
    
    if (decl.type === 'Identifier') {
      return decl.name;
    }
    
    return 'default';
  }

  /**
   * Categorize a node into the appropriate specialized maps
   */
  categorizeNode(uuid, enrichedNode, originalNode) {
    const type = originalNode.type;

    // Import nodes
    if (type === 'ImportDeclaration') {
      this.imports.set(uuid, enrichedNode);
      return;
    }

    // Export nodes (may also be declarations)
    if (type === 'ExportNamedDeclaration' || 
        type === 'ExportDefaultDeclaration' || 
        type === 'ExportAllDeclaration') {
      this.exports.set(uuid, enrichedNode);
      
      // If it has a declaration, also add to declarations
      if (originalNode.declaration && enrichedNode.declaredNames.length > 0) {
        this.declarations.set(uuid, enrichedNode);
      }
      return;
    }

    // Declaration nodes (including require() imports which are also declarations)
    if (type === 'VariableDeclaration' ||
        type === 'FunctionDeclaration' ||
        type === 'ClassDeclaration' ||
        type === 'TSTypeAliasDeclaration' ||
        type === 'TSInterfaceDeclaration' ||
        type === 'TSEnumDeclaration' ||
        type === 'TSModuleDeclaration') {
      this.declarations.set(uuid, enrichedNode);
      
      // Also add to imports if it's a require() statement
      if (enrichedNode.isRequireImport) {
        this.imports.set(uuid, enrichedNode);
      }
      return;
    }

    // Expression statements that are CommonJS exports
    if (type === 'ExpressionStatement') {
      const expr = originalNode.expression;
      if (expr?.type === 'AssignmentExpression') {
        const left = expr.left;
        // module.exports = ... or exports.x = ...
        if (left?.type === 'MemberExpression') {
          if ((left.object?.name === 'module' && left.property?.name === 'exports') ||
              left.object?.name === 'exports') {
            this.exports.set(uuid, enrichedNode);
          }
        }
      }
    }
  }

  /**
   * Resolve a module path to an absolute file path
   */
  resolveModulePath(source, fromDir) {
    // Handle aliases first
    for (const [pattern, replacement] of Object.entries(this.aliasMap)) {
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(source)) {
        source = source.replace(regex, replacement);
        fromDir = path.dirname(replacement);
        break;
      }
    }

    // Handle @/ alias
    if (source.startsWith('@/')) {
      source = source.replace('@/', './');
      fromDir = this.srcPath;
    }

    // Handle ~/ alias
    if (source.startsWith('~/')) {
      source = source.replace('~/', './');
      fromDir = this.srcPath;
    }

    // Relative or absolute paths
    if (source.startsWith('.') || source.startsWith('/')) {
      let resolved = path.resolve(fromDir, source);
      const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
      
      for (const ext of extensions) {
        const candidate = resolved + ext;
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return candidate;
        }
      }
      return resolved;
    }

    // Handle baseUrl imports
    if (this.baseUrl) {
      const baseUrlResolved = path.join(this.baseUrl, source);
      const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
      
      for (const ext of extensions) {
        const candidate = baseUrlResolved + ext;
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return candidate;
        }
      }
    }

    // External package
    return null;
  }

  /**
   * Get all maps as a plain object for serialization
   */
  toJSON() {
    return {
      project: Object.fromEntries(this.project),
      imports: Object.fromEntries(this.imports),
      exports: Object.fromEntries(this.exports),
      declarations: Object.fromEntries(this.declarations),
    };
  }

  /**
   * Get summary statistics
   */
  getStats() {
    return {
      totalNodes: this.project.size,
      importNodes: this.imports.size,
      exportNodes: this.exports.size,
      declarationNodes: this.declarations.size,
    };
  }
}

module.exports = ProjectIndexer;
