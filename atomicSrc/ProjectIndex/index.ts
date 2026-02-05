import * as fs from 'fs';
import * as path from 'path';
import { Project, SourceFile, Node, SyntaxKind, ImportDeclaration, ExportDeclaration, ExportAssignment, ts } from 'ts-morph';

export interface DeclarationInfo {
  node: Node;
  name: string;
  isExported: boolean;
  kind: SyntaxKind;
  filePath: string;
  relativePath: string;
}

export interface ImportInfo {
  node: ImportDeclaration;
  importedNames: Array<{ local: string; imported: string }>;
  source: string;
  resolvedPath: string | null;
  filePath: string;
  relativePath: string;
}

export interface ExportInfo {
  node: Node;
  exportedNames: Array<{ local: string; exported: string }>;
  source: string | null;
  resolvedPath: string | null;
  isReExport: boolean;
  filePath: string;
  relativePath: string;
}

export interface IndexStats {
  totalNodes: number;
  importNodes: number;
  exportNodes: number;
  declarationNodes: number;
}

/**
 * ProjectIndex - Replaces ProjectIndexer.js
 *
 * Uses ts-morph to load and index a TypeScript/JavaScript project.
 * Provides type-safe access to declarations, imports, and exports.
 */
export class ProjectIndex {
  private project: Project;
  private srcPath: string;
  private declarations: Map<Node, DeclarationInfo> = new Map();
  private imports: Map<ImportDeclaration, ImportInfo> = new Map();
  private exports: Map<Node, ExportInfo> = new Map();
  private sourceFiles: SourceFile[] = [];

  constructor(srcPath: string, options: { verbose?: boolean } = {}) {
    this.srcPath = path.resolve(srcPath);

    const tsConfigPath = this.findTsConfig(this.srcPath);

    this.project = new Project({
      tsConfigFilePath: tsConfigPath,
      skipAddingFilesFromTsConfig: true,
      compilerOptions: {
        allowJs: true,
        checkJs: false,
        jsx: ts.JsxEmit.React,
        noEmit: true,
        skipLibCheck: true,
      },
    });
  }

  /**
   * Find tsconfig.json or jsconfig.json
   */
  private findTsConfig(srcPath: string): string | undefined {
    let searchDir = srcPath;

    for (let i = 0; i < 3; i++) {
      const tsconfigPath = path.join(searchDir, 'tsconfig.json');
      const jsconfigPath = path.join(searchDir, 'jsconfig.json');

      if (fs.existsSync(tsconfigPath)) {
        return tsconfigPath;
      } else if (fs.existsSync(jsconfigPath)) {
        return jsconfigPath;
      }
      searchDir = path.dirname(searchDir);
    }

    return undefined;
  }

  /**
   * Load and index all source files
   */
  async indexAll(files: Array<{ absolutePath: string; relativePath: string; extension: string }>): Promise<void> {
    const codeFiles = files.filter(f =>
      ['.js', '.jsx', '.ts', '.tsx'].includes(f.extension)
    );

    for (const file of codeFiles) {
      try {
        const sourceFile = this.project.addSourceFileAtPath(file.absolutePath);
        this.sourceFiles.push(sourceFile);
        this.indexFile(sourceFile, file.relativePath);
      } catch (error: any) {
        console.error(`Failed to index ${file.absolutePath}: ${error.message}`);
      }
    }
  }

  /**
   * Index a single source file
   */
  private indexFile(sourceFile: SourceFile, relativePath: string): void {
    const filePath = sourceFile.getFilePath();

    this.indexDeclarations(sourceFile, filePath, relativePath);
    this.indexImports(sourceFile, filePath, relativePath);
    this.indexExports(sourceFile, filePath, relativePath);
  }

  /**
   * Index all declarations in a file
   */
  private indexDeclarations(sourceFile: SourceFile, filePath: string, relativePath: string): void {
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
        const methodInfo: DeclarationInfo = {
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
      if (Node.isVariableDeclaration(decl)) {
        const varStatement = decl.getVariableStatement();
        if (varStatement) {
          isExported = varStatement.isExported();
        }
      } else if (Node.isExportable(decl)) {
        isExported = decl.isExported();
      }

      // Handle default exports (both anonymous and named with 'default' modifier)
      if (isExported) {
        // Check if this is a default export by looking at the declaration's modifiers
        let isDefaultExport = false;

        if (Node.isFunctionDeclaration(decl) || Node.isClassDeclaration(decl)) {
          // For function/class declarations, check if they have default export modifier
          const modifiers = decl.getModifiers();
          isDefaultExport = modifiers.some(mod =>
            mod.getText() === 'default'
          );
        } else {
          // For other nodes, check parent or symbol name
          const parent = decl.getParent();
          isDefaultExport = Node.isExportAssignment(parent) || name === 'default';
        }

        if (isDefaultExport || name === 'anonymous' || name === 'default') {
          if (isDefaultExport) {
            // Try to get the actual name for named defaults (e.g., export default function Button() {})
            if (Node.isFunctionDeclaration(decl)) {
              const funcName = decl.getName();
              if (funcName && funcName !== 'default') {
                name = funcName;
              } else {
                const fileName = path.basename(filePath, path.extname(filePath));
                name = `DEFAULT_${fileName}`;
              }
            } else if (Node.isClassDeclaration(decl)) {
              const className = decl.getName();
              if (className && className !== 'default') {
                name = className;
              } else {
                const fileName = path.basename(filePath, path.extname(filePath));
                name = `DEFAULT_${fileName}`;
              }
            } else {
              // For other anonymous defaults
              const fileName = path.basename(filePath, path.extname(filePath));
              name = `DEFAULT_${fileName}`;
            }
          }
        }
      }

      const info: DeclarationInfo = {
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
  private indexImports(sourceFile: SourceFile, filePath: string, relativePath: string): void {
    const importDecls = sourceFile.getImportDeclarations();

    for (const importDecl of importDecls) {
      const source = importDecl.getModuleSpecifierValue();
      const resolvedFile = importDecl.getModuleSpecifierSourceFile();
      const resolvedPath = resolvedFile?.getFilePath() || null;

      const importedNames: Array<{ local: string; imported: string }> = [];

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

      const info: ImportInfo = {
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
  private indexExports(sourceFile: SourceFile, filePath: string, relativePath: string): void {
    // First, create export entries for declarations that are directly exported
    // (e.g., export const X = ..., export function foo() {}, export default function bar() {})
    for (const [node, declInfo] of this.declarations) {
      if (declInfo.filePath === filePath && declInfo.isExported) {
        // Check if this is a default export
        let isDefaultExport = false;
        if (Node.isFunctionDeclaration(node) || Node.isClassDeclaration(node)) {
          const modifiers = node.getModifiers();
          isDefaultExport = modifiers.some(mod => mod.getText() === 'default');
        }

        const exportedNames: Array<{ local: string; exported: string }> = [
          {
            local: declInfo.name,
            exported: isDefaultExport ? 'default' : declInfo.name
          }
        ];

        const info: ExportInfo = {
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

      const exportedNames: Array<{ local: string; exported: string }> = [];

      const namedExports = exportDecl.getNamedExports();
      for (const namedExport of namedExports) {
        const exported = namedExport.getName();
        const local = namedExport.getAliasNode()?.getText() || exported;
        exportedNames.push({ local, exported });
      }

      if (exportDecl.isNamespaceExport()) {
        exportedNames.push({ local: '*', exported: '*' });
      }

      const info: ExportInfo = {
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
      let localName: string;
      let needsDeclaration = false; // Track if we need to create a declaration

      if (isDefault) {
        const expression = exportAssignment.getExpression();

        // Try to get the name from the expression
        let expressionName: string | undefined;
        if (Node.isFunctionExpression(expression) || Node.isArrowFunction(expression)) {
          // For function expressions, try to get the name
          const symbol = expression.getSymbol();
          expressionName = symbol?.getName();
          needsDeclaration = true; // Arrow/function expressions need declarations
        } else if (Node.isClassExpression(expression)) {
          // For class expressions, try to get the name
          const symbol = expression.getSymbol();
          expressionName = symbol?.getName();
          needsDeclaration = true;
        } else if (Node.isObjectLiteralExpression(expression)) {
          // Object literals are anonymous
          needsDeclaration = true;
        } else if (Node.isIdentifier(expression)) {
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
        } else {
          // Fall back to DEFAULT_[fileName] for anonymous expressions
          const fileName = path.basename(filePath, path.extname(filePath));
          localName = `DEFAULT_${fileName}`;
        }

        // Create a declaration for anonymous expressions
        if (needsDeclaration) {
          const declInfo: DeclarationInfo = {
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
          const declExportInfo: ExportInfo = {
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
      } else {
        localName = exportAssignment.getExpression().getText();
      }

      // Only create export entry for the assignment if we didn't already create one
      // for the expression (in the needsDeclaration case above)
      if (!needsDeclaration) {
        const exportedNames: Array<{ local: string; exported: string }> = [
          { local: localName, exported: isDefault ? 'default' : '=' }
        ];

        const info: ExportInfo = {
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
  getStats(): IndexStats {
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
  getDeclarations(): Map<Node, DeclarationInfo> {
    return this.declarations;
  }

  /**
   * Get all imports
   */
  getImports(): Map<ImportDeclaration, ImportInfo> {
    return this.imports;
  }

  /**
   * Get all exports
   */
  getExports(): Map<Node, ExportInfo> {
    return this.exports;
  }

  /**
   * Get the ts-morph Project instance
   */
  getProject(): Project {
    return this.project;
  }

  /**
   * Get all source files
   */
  getSourceFiles(): SourceFile[] {
    return this.sourceFiles;
  }

  /**
   * Get a source file by path
   */
  getSourceFile(filePath: string): SourceFile | undefined {
    return this.project.getSourceFile(filePath);
  }
}
