const { parse } = require('@typescript-eslint/typescript-estree');

/**
 * ScopeAnalyzer - Performs scope-aware identifier usage analysis
 * 
 * This class properly handles variable shadowing by tracking which
 * identifiers are declared in each scope.
 */
class ScopeAnalyzer {
  constructor() {
    this.parseCache = new Map();
  }

  /**
   * Check if an identifier from module scope is used within a piece of code
   * This properly handles shadowing - if the identifier is redeclared in a nested scope,
   * usages in that scope don't count as using the module-level declaration.
   * 
   * @param {string} code - The code to analyze
   * @param {string} identifier - The identifier to look for
   * @param {boolean} isJsx - Whether to parse as JSX
   * @returns {boolean} - True if the module-level identifier is used
   */
  isModuleScopeIdentifierUsed(code, identifier, isJsx = false) {
    let ast;
    try {
      ast = parse(code, {
        jsx: isJsx,
        loc: true,
        range: true,
        tokens: false,
        comment: false,
        errorOnUnknownASTType: false,
      });
    } catch (e) {
      // If parsing fails, fall back to regex-based check
      return this.regexFallback(code, identifier);
    }

    // Track scopes and check for usage
    return this.findUsageInNode(ast, identifier, new Set(), null);
  }

  /**
   * Recursively search for identifier usage, tracking shadowed names
   * @param {Object} node - AST node
   * @param {string} identifier - The identifier to look for
   * @param {Set} shadowedNames - Names that are shadowed in current scope
   * @param {Object} parent - Parent node (to check context)
   * @returns {boolean} - True if identifier is used (not shadowed)
   */
  findUsageInNode(node, identifier, shadowedNames, parent) {
    if (!node || typeof node !== 'object') {
      return false;
    }

    // Check if this node is an identifier reference to our target
    if (node.type === 'Identifier' && node.name === identifier) {
      // Skip if this is a property key in an object literal (not shorthand)
      if (parent?.type === 'Property' && parent.key === node && !parent.shorthand) {
        return false;
      }
      // Skip if this is a member expression property (e.g., obj.identifier)
      if (parent?.type === 'MemberExpression' && parent.property === node && !parent.computed) {
        return false;
      }
      // Only count if not shadowed
      if (!shadowedNames.has(identifier)) {
        return true;
      }
      return false;
    }

    // Handle JSX identifiers (used in JSX elements like <MyComponent />)
    if (node.type === 'JSXIdentifier' && node.name === identifier) {
      // Only count if not shadowed
      if (!shadowedNames.has(identifier)) {
        return true;
      }
      return false;
    }

    // Handle nodes that create new scopes and may declare variables
    if (this.createsScope(node)) {
      const newShadowed = new Set(shadowedNames);
      this.collectDeclaredNames(node, newShadowed);
      
      // Check children with potentially updated shadow set
      return this.checkChildren(node, identifier, newShadowed);
    }

    // For other nodes, just check children
    return this.checkChildren(node, identifier, shadowedNames);
  }

  /**
   * Check all children of a node for identifier usage
   */
  checkChildren(node, identifier, shadowedNames) {
    for (const key of Object.keys(node)) {
      if (key === 'parent' || key === 'range' || key === 'loc') continue;
      
      const child = node[key];
      
      if (Array.isArray(child)) {
        for (const item of child) {
          if (this.findUsageInNode(item, identifier, shadowedNames, node)) {
            return true;
          }
        }
      } else if (child && typeof child === 'object') {
        if (this.findUsageInNode(child, identifier, shadowedNames, node)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if a node creates a new scope
   */
  createsScope(node) {
    return [
      'FunctionDeclaration',
      'FunctionExpression',
      'ArrowFunctionExpression',
      'ClassDeclaration',
      'ClassExpression',
      'BlockStatement',
      'ForStatement',
      'ForInStatement',
      'ForOfStatement',
      'CatchClause',
    ].includes(node.type);
  }

  /**
   * Collect all variable names declared directly in this scope
   */
  collectDeclaredNames(node, shadowedNames) {
    switch (node.type) {
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        // Function parameters shadow module scope
        for (const param of node.params || []) {
          this.collectPatternNames(param, shadowedNames);
        }
        // Function name in function expression is also in scope
        if (node.id?.name) {
          shadowedNames.add(node.id.name);
        }
        break;

      case 'CatchClause':
        if (node.param) {
          this.collectPatternNames(node.param, shadowedNames);
        }
        break;

      case 'BlockStatement':
      case 'ForStatement':
      case 'ForInStatement':
      case 'ForOfStatement':
        // Collect let/const/var declarations at the start of block
        this.collectBlockDeclarations(node, shadowedNames);
        break;

      case 'ClassDeclaration':
      case 'ClassExpression':
        if (node.id?.name) {
          shadowedNames.add(node.id.name);
        }
        break;
    }
  }

  /**
   * Collect declarations from a block (var, let, const)
   */
  collectBlockDeclarations(node, shadowedNames) {
    const body = node.body || [];
    const statements = Array.isArray(body) ? body : [body];
    
    // Also check init for for-loops
    if (node.init?.type === 'VariableDeclaration') {
      for (const decl of node.init.declarations) {
        this.collectPatternNames(decl.id, shadowedNames);
      }
    }
    
    // Check left for for-in/for-of
    if (node.left?.type === 'VariableDeclaration') {
      for (const decl of node.left.declarations) {
        this.collectPatternNames(decl.id, shadowedNames);
      }
    }

    for (const stmt of statements) {
      if (stmt?.type === 'VariableDeclaration') {
        for (const decl of stmt.declarations) {
          this.collectPatternNames(decl.id, shadowedNames);
        }
      }
      // Also handle function declarations in block (hoisted)
      if (stmt?.type === 'FunctionDeclaration' && stmt.id?.name) {
        shadowedNames.add(stmt.id.name);
      }
    }
  }

  /**
   * Collect names from a pattern (handles destructuring)
   */
  collectPatternNames(pattern, names) {
    if (!pattern) return;

    switch (pattern.type) {
      case 'Identifier':
        names.add(pattern.name);
        break;

      case 'ObjectPattern':
        for (const prop of pattern.properties || []) {
          if (prop.type === 'Property') {
            this.collectPatternNames(prop.value, names);
          } else if (prop.type === 'RestElement') {
            this.collectPatternNames(prop.argument, names);
          }
        }
        break;

      case 'ArrayPattern':
        for (const element of pattern.elements || []) {
          if (element) {
            this.collectPatternNames(element, names);
          }
        }
        break;

      case 'RestElement':
        this.collectPatternNames(pattern.argument, names);
        break;

      case 'AssignmentPattern':
        this.collectPatternNames(pattern.left, names);
        break;
    }
  }

  /**
   * Fallback regex-based check for when parsing fails
   */
  regexFallback(code, identifier) {
    // Remove strings and comments
    const cleaned = code
      .replace(/`(?:[^`\\]|\\.)*`/g, '""')
      .replace(/'(?:[^'\\]|\\.)*'/g, '""')
      .replace(/"(?:[^"\\]|\\.)*"/g, '""')
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/(?:[^/\\]|\\.)+\/[gimsuy]*/g, '""');

    const escaped = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<![\\p{L}\\p{N}_$])${escaped}(?![\\p{L}\\p{N}_$])`, 'u');
    return regex.test(cleaned);
  }
}

module.exports = ScopeAnalyzer;
