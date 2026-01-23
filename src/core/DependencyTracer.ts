import { Node, SourceFile, SyntaxKind } from 'ts-morph';
import { ProjectIndex, DeclarationInfo } from './ProjectIndex';

export interface DependencyInfo {
  declaration: DeclarationInfo;
  internal: Node[];
  external: Map<Node, string>;
}

export interface TraceSummary {
  totalDeclarations: number;
  withInternalDependants: number;
  withExternalDependants: number;
  orphaned: number;
}

/**
 * DependencyTracer - Replaces DependencyTracer.js + ScopeAnalyzer.js
 *
 * Uses ts-morph's findReferencesAsNodes() to trace declaration usage.
 * This eliminates the need for manual scope analysis and regex fallbacks.
 */
export class DependencyTracer {
  private index: ProjectIndex;
  private traced: Map<Node, DependencyInfo> = new Map();

  constructor(index: ProjectIndex) {
    this.index = index;
  }

  /**
   * Trace all declarations in the project
   */
  traceAll(): Map<Node, DependencyInfo> {
    const declarations = this.index.getDeclarations();

    for (const [node, declInfo] of declarations) {
      try {
        const dependencyInfo = this.traceDeclaration(node, declInfo);
        this.traced.set(node, dependencyInfo);
      } catch (error: any) {
        console.error(`Failed to trace ${declInfo.name}: ${error.message}`);
      }
    }

    return this.traced;
  }

  /**
   * Trace a single declaration's dependencies
   * Uses manual identifier search as a simple starting implementation
   */
  private traceDeclaration(node: Node, declInfo: DeclarationInfo): DependencyInfo {
    const internal: Node[] = [];
    const external = new Map<Node, string>();
    const sourceFile = node.getSourceFile();
    const declName = declInfo.name;

    // Skip only if there's no name at all (shouldn't happen with DEFAULT_fileName fallback)
    if (!declName) {
      return {
        declaration: declInfo,
        internal,
        external,
      };
    }

    const allSourceFiles = this.index.getSourceFiles();

    // Check if this is a default export (either starts with DEFAULT_ or is exported as default)
    const isDefaultExport = declName.startsWith('DEFAULT_') || this.isDefaultExport(declInfo);

    // For default exports, we need to trace differently because the local import name can be anything
    if (isDefaultExport) {
      const myFilePath = sourceFile.getFilePath();

      for (const sf of allSourceFiles) {
        const importDecls = sf.getImportDeclarations();

        for (const importDecl of importDecls) {
          const resolvedFile = importDecl.getModuleSpecifierSourceFile();
          if (!resolvedFile || resolvedFile.getFilePath() !== myFilePath) continue;

          // Check if this is a default import
          const defaultImport = importDecl.getDefaultImport();
          if (!defaultImport) continue;

          // Now trace usages of this local import name
          const localImportName = defaultImport.getText();
          const identifiers = sf.getDescendantsOfKind(SyntaxKind.Identifier);

          for (const identifier of identifiers) {
            if (identifier.getText() !== localImportName) continue;
            if (identifier === defaultImport) continue; // Skip the import declaration itself

            const topLevelNode = this.getTopLevelNode(identifier);
            if (!topLevelNode) continue;

            if (sf === sourceFile) {
              if (!internal.includes(topLevelNode)) {
                internal.push(topLevelNode);
              }
            } else {
              if (!external.has(topLevelNode)) {
                external.set(topLevelNode, sf.getFilePath());
              }
            }
          }
        }
      }

      // Also trace re-exports of this default export
      // e.g., export { default as Button } from './Button'
      for (const sf of allSourceFiles) {
        const exportDecls = sf.getExportDeclarations();

        for (const exportDecl of exportDecls) {
          const moduleSpec = exportDecl.getModuleSpecifierSourceFile();
          if (!moduleSpec || moduleSpec.getFilePath() !== myFilePath) continue;

          // Check if this re-exports our default
          const namedExports = exportDecl.getNamedExports();
          for (const namedExport of namedExports) {
            const nameNode = namedExport.getNameNode();
            const aliasNode = namedExport.getAliasNode();
            const imported = nameNode.getText();
            const exported = aliasNode ? aliasNode.getText() : imported;

            // If it re-exports 'default' as something else, trace usages of that name
            if (imported === 'default') {
              // Now find imports of this re-exported name from this barrel file
              const barrelFilePath = sf.getFilePath();

              for (const consumerSf of allSourceFiles) {
                const consumerImports = consumerSf.getImportDeclarations();

                for (const consumerImport of consumerImports) {
                  const consumerResolvedFile = consumerImport.getModuleSpecifierSourceFile();
                  if (!consumerResolvedFile || consumerResolvedFile.getFilePath() !== barrelFilePath) continue;

                  // Check if they import the re-exported name
                  const namedImports = consumerImport.getNamedImports();
                  for (const namedImport of namedImports) {
                    if (namedImport.getName() !== exported) continue;

                    // Found an import of the re-exported default! Trace its usages
                    const localName = namedImport.getAliasNode()?.getText() || namedImport.getName();
                    const identifiers = consumerSf.getDescendantsOfKind(SyntaxKind.Identifier);

                    for (const identifier of identifiers) {
                      if (identifier.getText() !== localName) continue;
                      if (identifier.getFirstAncestorByKind(SyntaxKind.ImportDeclaration) === consumerImport) continue;

                      const topLevelNode = this.getTopLevelNode(identifier);
                      if (!topLevelNode) continue;

                      if (!external.has(topLevelNode)) {
                        external.set(topLevelNode, consumerSf.getFilePath());
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    } else {
      // Regular (non-default) declaration tracing
      for (const sf of allSourceFiles) {
        const identifiers = sf.getDescendantsOfKind(SyntaxKind.Identifier);

        for (const identifier of identifiers) {
          if (identifier.getText() !== declName) continue;

          const symbol = identifier.getSymbol();
          if (!symbol) continue;

          const declarations = symbol.getDeclarations();
          const isReferenceToOurDeclaration = declarations.some(d => d === node);

          if (!isReferenceToOurDeclaration) continue;

          if (identifier === node) continue;

          const topLevelNode = this.getTopLevelNode(identifier);
          if (!topLevelNode) continue;

          if (sf === sourceFile) {
            if (!internal.includes(topLevelNode)) {
              internal.push(topLevelNode);
            }
          } else {
            if (!external.has(topLevelNode)) {
              external.set(topLevelNode, sf.getFilePath());
            }
          }
        }
      }
    }

    return {
      declaration: declInfo,
      internal,
      external,
    };
  }

  /**
   * Check if a declaration is exported as default
   */
  private isDefaultExport(declInfo: DeclarationInfo): boolean {
    const node = declInfo.node;

    // Check if the node has a default export modifier (for export default function Foo() {})
    if (Node.isExportable(node)) {
      const hasDefault = node.hasDefaultKeyword?.() || false;
      if (hasDefault) return true;
    }

    // Check exports to see if this declaration is exported as 'default'
    const exports = Array.from(this.index.getExports().values());
    const filePath = declInfo.filePath;

    for (const exportInfo of exports) {
      if (exportInfo.filePath !== filePath) continue;

      for (const { local, exported } of exportInfo.exportedNames) {
        if (exported === 'default' && (local === declInfo.name || local.startsWith('DEFAULT_'))) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get the top-level node (statement) containing a reference
   */
  private getTopLevelNode(node: Node): Node | null {
    let current: Node | undefined = node;

    while (current) {
      const parent = current.getParent();

      if (!parent || Node.isSourceFile(parent)) {
        return current;
      }

      current = parent;
    }

    return null;
  }

  /**
   * Get traced dependencies
   */
  getTraced(): Map<Node, DependencyInfo> {
    return this.traced;
  }

  /**
   * Get summary statistics
   */
  getSummary(): TraceSummary {
    let withInternalDependants = 0;
    let withExternalDependants = 0;
    let orphaned = 0;

    for (const [_, info] of this.traced) {
      const hasInternal = info.internal.length > 0;
      const hasExternal = info.external.size > 0;

      if (hasInternal) withInternalDependants++;
      if (hasExternal) withExternalDependants++;
      if (!hasInternal && !hasExternal) orphaned++;
    }

    return {
      totalDeclarations: this.traced.size,
      withInternalDependants,
      withExternalDependants,
      orphaned,
    };
  }

  /**
   * Check if a declaration is exported
   */
  isExported(node: Node): boolean {
    const declInfo = this.index.getDeclarations().get(node);
    return declInfo?.isExported || false;
  }

  /**
   * Get dependencies for a specific node
   */
  getDependencies(node: Node): DependencyInfo | undefined {
    return this.traced.get(node);
  }

  /**
   * Get all declarations in a file
   */
  getDeclarationsInFile(filePath: string): DeclarationInfo[] {
    const declarations = this.index.getDeclarations();
    const result: DeclarationInfo[] = [];

    for (const [_, declInfo] of declarations) {
      if (declInfo.filePath === filePath) {
        result.push(declInfo);
      }
    }

    return result;
  }

  /**
   * Find all external dependants of a declaration (files that import it)
   */
  getExternalDependants(node: Node): Map<string, Node[]> {
    const deps = this.traced.get(node);
    if (!deps) return new Map();

    const byFile = new Map<string, Node[]>();

    for (const [refNode, filePath] of deps.external) {
      if (!byFile.has(filePath)) {
        byFile.set(filePath, []);
      }
      byFile.get(filePath)!.push(refNode);
    }

    return byFile;
  }

  /**
   * Find all internal dependants (same file usage)
   */
  getInternalDependants(node: Node): Node[] {
    const deps = this.traced.get(node);
    return deps?.internal || [];
  }
}
