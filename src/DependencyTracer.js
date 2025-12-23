const fs = require('fs');
const path = require('path');
const { parse } = require('@typescript-eslint/typescript-estree');
const ScopeAnalyzer = require('./ScopeAnalyzer');

/**
 * DependencyTracer - Phase 2 of the Atomizer pipeline
 * 
 * For every declaration node in the project, finds its usage throughout the entire application:
 * 
 * 1. Internal Usage (dependant.internal):
 *    - Traces through the node's own AST for internal usage of the name within module scope
 *    - Stores UUIDs of top-level nodes within which it is found (other than itself)
 *    - Duplicate usage within a single top-level node only records one instance
 * 
 * 2. External Usage (dependant.external):
 *    - If a declaration is exported, traces through all file imports to find where that 
 *      symbol is imported from its file
 *    - Handles all export/import syntax types
 *    - Performs the same module tracing logic for each module that imports
 *    - If an importing file re-exports, recursively follows the import lookup
 */
class DependencyTracer {
  constructor(indexer) {
    this.indexer = indexer;
    this.project = indexer.project;
    this.imports = indexer.imports;
    this.exports = indexer.exports;
    this.declarations = indexer.declarations;
    this.scopeAnalyzer = new ScopeAnalyzer();
    
    // Build lookup indices for faster tracing
    this.fileToNodes = this.buildFileToNodesMap();
    this.fileToImports = this.buildFileToImportsMap();
    this.fileToExports = this.buildFileToExportsMap();
    this.exportedNameToUuid = this.buildExportedNameIndex();
  }

  /**
   * Build a map of filePath -> array of node UUIDs
   */
  buildFileToNodesMap() {
    const map = new Map();
    
    for (const [uuid, node] of this.project) {
      const filePath = node.filePath;
      if (!map.has(filePath)) {
        map.set(filePath, []);
      }
      map.get(filePath).push(uuid);
    }
    
    return map;
  }

  /**
   * Build a map of filePath -> array of import node UUIDs
   */
  buildFileToImportsMap() {
    const map = new Map();
    
    for (const [uuid, node] of this.imports) {
      const filePath = node.filePath;
      if (!map.has(filePath)) {
        map.set(filePath, []);
      }
      map.get(filePath).push(uuid);
    }
    
    return map;
  }

  /**
   * Build a map of filePath -> array of export node UUIDs
   */
  buildFileToExportsMap() {
    const map = new Map();
    
    for (const [uuid, node] of this.exports) {
      const filePath = node.filePath;
      if (!map.has(filePath)) {
        map.set(filePath, []);
      }
      map.get(filePath).push(uuid);
    }
    
    return map;
  }

  /**
   * Build an index of (filePath, exportedName) -> declaration UUID
   */
  buildExportedNameIndex() {
    const map = new Map();
    
    for (const [uuid, node] of this.exports) {
      for (const exp of node.exportedNames || []) {
        const key = `${node.filePath}::${exp.exported}`;
        map.set(key, { uuid, localName: exp.local, exportedName: exp.exported });
      }
    }
    
    return map;
  }

  /**
   * Trace all declarations and build their dependant objects
   * @returns {Map} - Map of UUID -> node with dependant property added
   */
  traceAll() {
    const results = new Map();

    for (const [uuid, node] of this.declarations) {
      const traced = this.traceDeclaration(uuid, node);
      results.set(uuid, traced);
    }

    return results;
  }

  /**
   * Trace a single declaration's usage
   */
  traceDeclaration(uuid, node) {
    const result = {
      ...node,
      dependant: {
        internal: [],  // UUIDs of top-level nodes in same file that use this declaration
        external: {},  // { consumingUuid: true } for nodes in other files that use this
      },
    };

    // For each declared name in this node
    for (const name of node.declaredNames || []) {
      // 1. Find internal usage within the same file
      const internalUuids = this.findInternalUsage(uuid, name, node.filePath);
      for (const internalUuid of internalUuids) {
        if (!result.dependant.internal.includes(internalUuid)) {
          result.dependant.internal.push(internalUuid);
        }
      }

      // 2. Find external usage if the declaration is exported
      if (node.isExported || this.isNameExported(name, node.filePath)) {
        // Get the exported name(s) for this declared name
        // For default exports, the declared name is e.g. "EndSlides" but the exported name is "default"
        const exportedNames = this.getExportedNamesForDeclaredName(name, node);
        
        for (const exportedName of exportedNames) {
          const externalUuids = this.findExternalUsage(exportedName, node.filePath, new Set());
          for (const externalUuid of externalUuids) {
            result.dependant.external[externalUuid] = true;
          }
        }
      }
    }

    return result;
  }

  /**
   * Get the exported name(s) for a declared name
   * For example, if a function "EndSlides" is exported as default, returns ["default"]
   * For named exports like "export const foo", returns ["foo"]
   */
  getExportedNamesForDeclaredName(declaredName, node) {
    const exportedNames = [];
    
    // Check the node's own exportedNames first
    for (const exp of node.exportedNames || []) {
      if (exp.local === declaredName) {
        exportedNames.push(exp.exported);
      }
    }
    
    // If the node itself doesn't have export info, check separate export statements
    if (exportedNames.length === 0) {
      const exportUuids = this.fileToExports.get(node.filePath) || [];
      for (const exportUuid of exportUuids) {
        const exportNode = this.exports.get(exportUuid);
        for (const exp of exportNode.exportedNames || []) {
          if (exp.local === declaredName) {
            exportedNames.push(exp.exported);
          }
        }
      }
    }
    
    // Fallback: if no export mapping found, use the declared name itself
    // (this handles cases like `export const foo = ...` where local === exported)
    if (exportedNames.length === 0) {
      exportedNames.push(declaredName);
    }
    
    return exportedNames;
  }

  /**
   * Check if a name is exported from a file (either directly or via separate export statement)
   */
  isNameExported(name, filePath) {
    const exportUuids = this.fileToExports.get(filePath) || [];
    
    for (const exportUuid of exportUuids) {
      const exportNode = this.exports.get(exportUuid);
      for (const exp of exportNode.exportedNames || []) {
        if (exp.local === name || exp.exported === name) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Find internal usage of a name within the same file
   * Returns array of UUIDs of top-level nodes that use this name
   */
  findInternalUsage(declarationUuid, name, filePath) {
    const usageUuids = [];
    const nodeUuids = this.fileToNodes.get(filePath) || [];

    for (const nodeUuid of nodeUuids) {
      // Skip the declaration itself
      if (nodeUuid === declarationUuid) continue;

      const node = this.project.get(nodeUuid);
      if (!node || !node.raw) continue;

      // Check if the name is used in this node's code
      if (this.isIdentifierUsedInCode(node.raw, name)) {
        usageUuids.push(nodeUuid);
      }
    }

    return usageUuids;
  }

  /**
   * Find external usage of a name across all files
   * Recursively follows re-exports
   * @param {Set} visited - Set of already visited (filePath::name) to prevent infinite loops
   */
  findExternalUsage(name, sourceFilePath, visited) {
    const usageUuids = [];
    const visitKey = `${sourceFilePath}::${name}`;
    
    if (visited.has(visitKey)) {
      return usageUuids;
    }
    visited.add(visitKey);

    // Find all imports across the project that import from sourceFilePath
    for (const [importUuid, importNode] of this.imports) {
      // Skip imports in the same file
      if (importNode.filePath === sourceFilePath) continue;

      // Resolve the import source to an absolute path
      const resolvedPath = this.indexer.resolveModulePath(
        importNode.importSource,
        path.dirname(importNode.filePath)
      );

      // Check if this import is from our source file
      if (resolvedPath !== sourceFilePath) continue;

      // Check if this import includes our name
      const matchingSpec = this.findMatchingImportSpecifier(importNode, name);
      if (!matchingSpec) continue;

      // The local name used in the consuming file
      const localName = matchingSpec.local;

      // Find all top-level nodes in the consuming file that use this local name
      const consumingFileUuids = this.fileToNodes.get(importNode.filePath) || [];
      
      for (const consumerUuid of consumingFileUuids) {
        // Skip the import statement itself
        if (consumerUuid === importUuid) continue;

        const consumerNode = this.project.get(consumerUuid);
        if (!consumerNode || !consumerNode.raw) continue;

        if (this.isIdentifierUsedInCode(consumerNode.raw, localName)) {
          if (!usageUuids.includes(consumerUuid)) {
            usageUuids.push(consumerUuid);
          }
        }
      }

      // Check if the consuming file re-exports this symbol
      const reexports = this.findReexports(importNode.filePath, localName);
      for (const reexport of reexports) {
        // Recursively trace through the re-export
        const reexportName = reexport.exportedName;
        const furtherUsage = this.findExternalUsage(reexportName, importNode.filePath, visited);
        usageUuids.push(...furtherUsage);
      }
    }

    // Also check for re-exports that use export { x } from './source'
    for (const [exportUuid, exportNode] of this.exports) {
      // Skip exports in the same file
      if (exportNode.filePath === sourceFilePath) continue;
      
      // Check if this is a re-export from our source file
      if (!exportNode.exportSource) continue;

      const resolvedExportSource = this.indexer.resolveModulePath(
        exportNode.exportSource,
        path.dirname(exportNode.filePath)
      );

      if (resolvedExportSource !== sourceFilePath) continue;

      // Check if this re-export includes our name
      const matchingSpec = (exportNode.exportedNames || []).find(
        spec => spec.local === name || spec.local === '*'
      );

      if (!matchingSpec) continue;

      // This is a re-export, recursively trace
      const reexportedName = matchingSpec.exported === '*' ? name : matchingSpec.exported;
      const furtherUsage = this.findExternalUsage(reexportedName, exportNode.filePath, visited);
      usageUuids.push(...furtherUsage);
    }

    return usageUuids;
  }

  /**
   * Find a matching import specifier for a given name
   */
  findMatchingImportSpecifier(importNode, name) {
    for (const spec of importNode.importedNames || []) {
      // Handle default import (ES modules)
      if (name === 'default' && spec.type === 'default') {
        return spec;
      }
      // Handle require-default (CommonJS default import)
      // const X = require('./X') where module.exports = X
      // This imports the whole module, so we match if name is the exported name
      if (spec.type === 'require-default') {
        // For CommonJS, the whole module is imported as a single name
        // If the source file exports a class/function with this name via module.exports,
        // we should match. We also match 'default' since that's the conventional name.
        return spec;
      }
      // Handle namespace import (import * as X)
      if (spec.type === 'namespace') {
        // Namespace imports capture everything
        return spec;
      }
      // Handle named import
      if (spec.imported === name) {
        return spec;
      }
      // Handle require-named (CommonJS destructuring)
      // const { x } = require('./module')
      if (spec.type === 'require-named' && spec.imported === name) {
        return spec;
      }
    }
    return null;
  }

  /**
   * Find re-exports of a local name from a file
   */
  findReexports(filePath, localName) {
    const reexports = [];
    const exportUuids = this.fileToExports.get(filePath) || [];

    for (const exportUuid of exportUuids) {
      const exportNode = this.exports.get(exportUuid);
      
      // Skip re-exports (they have exportSource), we want local exports
      if (exportNode.exportSource) continue;

      for (const exp of exportNode.exportedNames || []) {
        if (exp.local === localName) {
          reexports.push({
            uuid: exportUuid,
            localName: exp.local,
            exportedName: exp.exported,
          });
        }
      }
    }

    return reexports;
  }

  /**
   * Check if an identifier is used in code (not in strings, comments, or regex literals)
   * Uses scope-aware analysis to handle variable shadowing correctly.
   * Also excludes object property keys that just happen to match the identifier name.
   * 
   * @param {string} code - The code to check
   * @param {string} identifier - The identifier to look for
   * @param {boolean} useScopeAnalysis - Whether to use full AST-based scope analysis (slower but accurate)
   * @returns {boolean} - True if the identifier is used
   */
  isIdentifierUsedInCode(code, identifier, useScopeAnalysis = true) {
    // Determine if code is JSX based on content
    const isJsx = /<[A-Z][a-zA-Z]*/.test(code) || /\/>/.test(code);
    
    // Try scope-aware analysis first (handles shadowing correctly)
    if (useScopeAnalysis) {
      try {
        return this.scopeAnalyzer.isModuleScopeIdentifierUsed(code, identifier, isJsx);
      } catch (e) {
        // Fall back to regex if parsing fails
      }
    }
    
    // Fallback: regex-based check (doesn't handle shadowing)
    return this.regexIdentifierCheck(code, identifier);
  }

  /**
   * Regex-based identifier check (fallback when AST parsing fails)
   */
  regexIdentifierCheck(code, identifier) {
    // Remove string literals (handling escaped quotes)
    let cleaned = code
      .replace(/`(?:[^`\\]|\\.)*`/g, '""')     // Template literals
      .replace(/'(?:[^'\\]|\\.)*'/g, '""')     // Single-quoted strings
      .replace(/"(?:[^"\\]|\\.)*"/g, '""')     // Double-quoted strings
      .replace(/\/\/.*$/gm, '')                 // Single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '')         // Multi-line comments
      .replace(/\/(?:[^/\\]|\\.)+\/[gimsuy]*/g, '""'); // Regex literals

    // Remove object property keys (identifier followed by colon, not ::)
    // This handles { identifier: value } but not { identifier } (shorthand)
    const propKeyRegex = new RegExp(
      `([{,]\\s*)${this.escapeRegExp(identifier)}(\\s*:)(?!:)`,
      'g'
    );
    cleaned = cleaned.replace(propKeyRegex, '$1__REMOVED__$2');

    // Match whole word only using word boundaries
    // For Unicode support, we also check that the character before/after isn't a valid identifier char
    const escapedId = this.escapeRegExp(identifier);
    const regex = new RegExp(`(?<![\\p{L}\\p{N}_$])${escapedId}(?![\\p{L}\\p{N}_$])`, 'u');
    return regex.test(cleaned);
  }

  /**
   * Escape special regex characters
   */
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Get a summary of all traced declarations
   */
  getSummary() {
    const traced = this.traceAll();
    const summary = {
      totalDeclarations: traced.size,
      withInternalDependants: 0,
      withExternalDependants: 0,
      orphaned: 0,  // Declarations with no dependants
    };

    for (const [uuid, node] of traced) {
      const hasInternal = node.dependant.internal.length > 0;
      const hasExternal = Object.keys(node.dependant.external).length > 0;

      if (hasInternal) summary.withInternalDependants++;
      if (hasExternal) summary.withExternalDependants++;
      if (!hasInternal && !hasExternal) summary.orphaned++;
    }

    return summary;
  }

  /**
   * Convert traced results to a plain object for JSON serialization
   */
  toJSON() {
    const traced = this.traceAll();
    const result = {};

    for (const [uuid, node] of traced) {
      result[uuid] = {
        name: node.declaredNames?.[0] || 'unknown',
        filePath: node.relativePath,
        type: node.nodeType,
        isExported: node.isExported,
        dependant: {
          internal: node.dependant.internal,
          external: Object.keys(node.dependant.external),
        },
      };
    }

    return result;
  }
}

module.exports = DependencyTracer;
