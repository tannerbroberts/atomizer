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
        internal: [],
        external: {},
      },
    };


    for (const name of node.declaredNames || []) {

      const internalUuids = this.findInternalUsage(uuid, name, node.filePath);
      for (const internalUuid of internalUuids) {
        if (!result.dependant.internal.includes(internalUuid)) {
          result.dependant.internal.push(internalUuid);
        }
      }


      if (node.isExported || this.isNameExported(name, node.filePath)) {


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


    for (const exp of node.exportedNames || []) {
      if (exp.local === declaredName) {
        exportedNames.push(exp.exported);
      }
    }


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

      if (nodeUuid === declarationUuid) continue;

      const node = this.project.get(nodeUuid);
      if (!node || !node.raw) continue;


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


    for (const [importUuid, importNode] of this.imports) {

      if (importNode.filePath === sourceFilePath) continue;


      const resolvedPath = this.indexer.resolveModulePath(
        importNode.importSource,
        path.dirname(importNode.filePath)
      );


      if (resolvedPath !== sourceFilePath) continue;


      const matchingSpec = this.findMatchingImportSpecifier(importNode, name);
      if (!matchingSpec) continue;


      const localName = matchingSpec.local;


      const consumingFileUuids = this.fileToNodes.get(importNode.filePath) || [];

      for (const consumerUuid of consumingFileUuids) {

        if (consumerUuid === importUuid) continue;

        const consumerNode = this.project.get(consumerUuid);
        if (!consumerNode || !consumerNode.raw) continue;

        if (this.isIdentifierUsedInCode(consumerNode.raw, localName)) {
          if (!usageUuids.includes(consumerUuid)) {
            usageUuids.push(consumerUuid);
          }
        }
      }


      const reexports = this.findReexports(importNode.filePath, localName);
      for (const reexport of reexports) {

        const reexportName = reexport.exportedName;
        const furtherUsage = this.findExternalUsage(reexportName, importNode.filePath, visited);
        usageUuids.push(...furtherUsage);
      }
    }


    for (const [exportUuid, exportNode] of this.exports) {

      if (exportNode.filePath === sourceFilePath) continue;


      if (!exportNode.exportSource) continue;

      const resolvedExportSource = this.indexer.resolveModulePath(
        exportNode.exportSource,
        path.dirname(exportNode.filePath)
      );

      if (resolvedExportSource !== sourceFilePath) continue;


      const matchingSpec = (exportNode.exportedNames || []).find(
        spec => spec.local === name || spec.local === '*'
      );

      if (!matchingSpec) continue;


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

      if (name === 'default' && spec.type === 'default') {
        return spec;
      }



      if (spec.type === 'require-default') {



        return spec;
      }

      if (spec.type === 'namespace') {

        return spec;
      }

      if (spec.imported === name) {
        return spec;
      }


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

    const isJsx = /<[A-Z][a-zA-Z]*/.test(code) || /\/>/.test(code);


    if (useScopeAnalysis) {
      try {
        return this.scopeAnalyzer.isModuleScopeIdentifierUsed(code, identifier, isJsx);
      } catch (e) {

      }
    }


    return this.regexIdentifierCheck(code, identifier);
  }

  /**
   * Regex-based identifier check (fallback when AST parsing fails)
   */
  regexIdentifierCheck(code, identifier) {

    let cleaned = code
      .replace(/`(?:[^`\\]|\\.)*`/g, '""')
      .replace(/'(?:[^'\\]|\\.)*'/g, '""')
      .replace(/"(?:[^"\\]|\\.)*"/g, '""')
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/(?:[^/\\]|\\.)+\/[gimsuy]*/g, '""'); // Regex literals



    const propKeyRegex = new RegExp(
      `([{,]\\s*)${this.escapeRegExp(identifier)}(\\s*:)(?!:)`,
      'g'
    );
    cleaned = cleaned.replace(propKeyRegex, '$1__REMOVED__$2');



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
      orphaned: 0,
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
