const fs = require('fs');
const path = require('path');
const { parse } = require('@typescript-eslint/typescript-estree');

class ASTAnalyzer {
  constructor(srcPath, options = {}) {
    this.srcPath = srcPath;
    this.options = options;
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

  async analyzeAll(files) {
    const codeFiles = files.filter(f =>
      ['.js', '.jsx', '.ts', '.tsx'].includes(f.extension)
    );

    const results = [];

    for (const file of codeFiles) {
      try {
        const result = await this.analyzeFile(file);
        results.push(result);
      } catch (error) {

        results.push({
          ...file,
          filePath: file.absolutePath,
          classification: 'unknown',
          error: error.message,
          imports: [],
          exports: [],
          jsxElements: [],
        });
      }
    }


    const nonCodeFiles = files.filter(f =>
      !['.js', '.jsx', '.ts', '.tsx'].includes(f.extension)
    );


    const rootConfigPatterns = [
      'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
      'tsconfig.json', 'jsconfig.json', 'tsconfig.*.json',
      '.eslintrc', '.eslintrc.json', '.eslintrc.js', '.eslintrc.cjs',
      '.prettierrc', '.prettierrc.json', '.prettierrc.js',
      'babel.config.js', 'babel.config.json', '.babelrc',
      'next.config.js', 'next.config.mjs', 'next.config.ts',
      'vite.config.js', 'vite.config.ts', 'vite.config.mjs',
      'vitest.config.js', 'vitest.config.ts',
      'jest.config.js', 'jest.config.ts', 'jest.config.json',
      'tailwind.config.js', 'tailwind.config.ts',
      'postcss.config.js', 'postcss.config.mjs', 'postcss.config.cjs',
      '.env', '.env.local', '.env.development', '.env.production', '.env.example',
      'turbo.json', 'nx.json', 'lerna.json',
      '.gitignore', '.npmignore', '.dockerignore',
      'README.md', 'LICENSE', 'LICENSE.md', 'CHANGELOG.md', 'CONTRIBUTING.md',
      'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
      '.github', '.vscode', '.husky',
    ];

    for (const file of nonCodeFiles) {

      const isRootConfig = rootConfigPatterns.some(pattern => {
        const fileName = file.name + file.extension;
        if (pattern.includes('*')) {
          const regex = new RegExp('^' + pattern.replace('.', '\\.').replace('*', '.*') + '$');
          return regex.test(fileName);
        }
        return fileName === pattern || fileName.startsWith(pattern + '.');
      });


      const isAtRoot = !file.relativePath.includes(path.sep) ||
                       file.relativePath.split(path.sep).length <= 2;

      const classification = isRootConfig && isAtRoot ? 'root-config' : 'asset';

      results.push({
        ...file,
        filePath: file.absolutePath,
        classification,
        imports: [],
        exports: [],
        jsxElements: [],
      });
    }

    return results;
  }

  async analyzeFile(file) {
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

    const imports = this.extractImports(ast, file.absolutePath);
    const exports = this.extractExports(ast, content);
    const jsxElements = this.extractJSXElements(ast);
    const hasJSXReturn = this.hasJSXReturn(ast);

    const classification = this.classifyFile(exports, hasJSXReturn, file);


    const exportedHooks = exports.filter(e => e.isHook);
    const exportedComponents = exports.filter(e => e.isComponent);

    return {
      ...file,
      filePath: file.absolutePath,
      classification,
      imports,
      exports,
      exportedHooks,
      exportedComponents,
      jsxElements,
      hasJSXReturn,
    };
  }

  extractImports(ast, filePath) {
    const imports = [];
    const fileDir = path.dirname(filePath);

    const visit = (node) => {
      if (!node || typeof node !== 'object') return;

      if (node.type === 'ImportDeclaration') {
        const source = node.source.value;
        const resolvedPath = this.resolveModulePath(source, fileDir);

        const specifiers = (node.specifiers || []).map(spec => ({
          type: spec.type,
          imported: spec.imported?.name || spec.local?.name,
          local: spec.local?.name,
        }));


        const isPackage = !source.startsWith('.') && !source.startsWith('@/') && !resolvedPath;

        imports.push({
          source,
          resolvedPath,
          specifiers,
          isRelative: source.startsWith('.'),
          isPackage,
        });
      }


      if (node.type === 'CallExpression' &&
          node.callee?.type === 'Import') {
        const arg = node.arguments?.[0];
        if (arg?.type === 'Literal') {
          const source = arg.value;
          const resolvedPath = this.resolveModulePath(source, fileDir);
          const isPackage = !source.startsWith('.') && !source.startsWith('@/') && !resolvedPath;
          imports.push({
            source,
            resolvedPath,
            specifiers: [],
            isDynamic: true,
            isRelative: source.startsWith('.'),
            isPackage,
          });
        }
      }


      if (node.type === 'CallExpression' &&
          node.callee?.name === 'require') {
        const arg = node.arguments?.[0];
        if (arg?.type === 'Literal') {
          const source = arg.value;
          const resolvedPath = this.resolveModulePath(source, fileDir);
          const isPackage = !source.startsWith('.') && !source.startsWith('@/') && !resolvedPath;
          imports.push({
            source,
            resolvedPath,
            specifiers: [],
            isRequire: true,
            isRelative: source.startsWith('.'),
            isPackage,
          });
        }
      }


      if ((node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration')
          && node.source) {
        const source = node.source.value;
        const resolvedPath = this.resolveModulePath(source, fileDir);
        const isPackage = !source.startsWith('.') && !source.startsWith('@/') && !resolvedPath;

        const specifiers = (node.specifiers || []).map(spec => ({
          type: 'reexport',
          imported: spec.local?.name,
          local: spec.exported?.name || spec.local?.name,
        }));

        imports.push({
          source,
          resolvedPath,
          specifiers,
          isReexport: true,
          isRelative: source.startsWith('.'),
          isPackage,
        });
      }

      for (const key in node) {
        const child = node[key];
        if (Array.isArray(child)) {
          child.forEach(visit);
        } else if (child && typeof child === 'object') {
          visit(child);
        }
      }
    };

    visit(ast);
    return imports;
  }

  resolveModulePath(source, fromDir) {

    for (const [pattern, replacement] of Object.entries(this.aliasMap)) {
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(source)) {
        source = source.replace(regex, replacement);
        fromDir = path.dirname(replacement);
        break;
      }
    }


    if (source.startsWith('@/')) {
      source = source.replace('@/', './');
      fromDir = this.srcPath;
    }


    if (source.startsWith('~/')) {
      source = source.replace('~/', './');
      fromDir = this.srcPath;
    }


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


    if (this.baseUrl && !source.includes('node_modules')) {

      const baseUrlResolved = path.join(this.baseUrl, source);


      const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];

      for (const ext of extensions) {
        const candidate = baseUrlResolved + ext;
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return candidate;
        }
      }
    }


    return null;
  }

  extractExports(ast, fileContent) {
    const exports = [];


    const declarationMap = new Map();


    const collectDeclarations = (node, parentName = null) => {
      if (!node || typeof node !== 'object') return;

      if (node.type === 'FunctionDeclaration' && node.id?.name) {
        declarationMap.set(node.id.name, {
          type: 'function',
          returnsJSX: this.functionReturnsJSX(node),
        });
      }

      if (node.type === 'VariableDeclaration') {
        for (const declarator of node.declarations) {
          if (declarator.id?.type === 'Identifier') {
            const init = declarator.init;
            if (init?.type === 'ArrowFunctionExpression' || init?.type === 'FunctionExpression') {
              declarationMap.set(declarator.id.name, {
                type: 'function',
                returnsJSX: this.functionReturnsJSX(init),
              });
            } else if (init?.type === 'CallExpression') {

              const callee = init.callee;
              const isReactWrapper =
                (callee?.type === 'MemberExpression' &&
                 callee.object?.name === 'React' &&
                 ['forwardRef', 'memo', 'lazy'].includes(callee.property?.name)) ||
                (callee?.type === 'Identifier' &&
                 ['forwardRef', 'memo', 'lazy'].includes(callee.name));

              if (isReactWrapper && init.arguments?.[0]) {
                const arg = init.arguments[0];
                if (arg.type === 'ArrowFunctionExpression' || arg.type === 'FunctionExpression') {
                  declarationMap.set(declarator.id.name, {
                    type: 'function',
                    returnsJSX: this.functionReturnsJSX(arg),
                  });
                }
              }
            }
          }
        }
      }

      for (const key in node) {
        const child = node[key];
        if (Array.isArray(child)) {
          child.forEach(c => collectDeclarations(c));
        } else if (child && typeof child === 'object') {
          collectDeclarations(child);
        }
      }
    };

    collectDeclarations(ast);

    const visit = (node) => {
      if (!node || typeof node !== 'object') return;

      if (node.type === 'ExportDefaultDeclaration') {
        const decl = node.declaration;
        let name = 'default';
        let kind = 'unknown';
        let returnsJSX = false;

        if (decl?.type === 'FunctionDeclaration' || decl?.type === 'FunctionExpression') {
          name = decl.id?.name || 'default';
          kind = 'function';
          returnsJSX = this.functionReturnsJSX(decl);
        } else if (decl?.type === 'ArrowFunctionExpression') {
          kind = 'arrow-function';
          returnsJSX = this.functionReturnsJSX(decl);
        } else if (decl?.type === 'ClassDeclaration') {
          name = decl.id?.name || 'default';
          kind = 'class';

          returnsJSX = this.classReturnsJSX(decl);
        } else if (decl?.type === 'Identifier') {
          name = decl.name;
          kind = 'identifier';

          const declInfo = declarationMap.get(name);
          if (declInfo) {
            returnsJSX = declInfo.returnsJSX;
          }
        }

        const isHook = name.startsWith('use') && /^use[A-Z]/.test(name);
        const isComponent = returnsJSX || (name !== 'default' && /^[A-Z]/.test(name) && kind !== 'class');

        exports.push({ name, kind, isDefault: true, isHook, isComponent: returnsJSX });
      }

      if (node.type === 'ExportNamedDeclaration') {
        const decl = node.declaration;

        if (decl?.type === 'FunctionDeclaration') {
          const name = decl.id?.name;
          const returnsJSX = this.functionReturnsJSX(decl);
          const isHook = name?.startsWith('use') && /^use[A-Z]/.test(name);

          exports.push({
            name,
            kind: 'function',
            isDefault: false,
            isHook,
            isComponent: returnsJSX,
          });
        } else if (decl?.type === 'ClassDeclaration') {
          const name = decl.id?.name;
          const returnsJSX = this.classReturnsJSX(decl);

          exports.push({
            name,
            kind: 'class',
            isDefault: false,
            isHook: false,
            isComponent: returnsJSX,
          });
        } else if (decl?.type === 'VariableDeclaration') {
          for (const declarator of decl.declarations) {
            if (declarator.id?.type === 'Identifier') {
              const name = declarator.id.name;
              const declInfo = declarationMap.get(name);
              const isHook = name.startsWith('use') && /^use[A-Z]/.test(name);
              const returnsJSX = declInfo?.returnsJSX || false;

              exports.push({
                name,
                kind: 'variable',
                isDefault: false,
                isHook,
                isComponent: returnsJSX,
              });
            }
          }
        }


        if (node.specifiers) {
          for (const spec of node.specifiers) {
            const localName = spec.local?.name;
            const exportedName = spec.exported?.name || localName;
            const declInfo = declarationMap.get(localName);
            const isHook = exportedName?.startsWith('use') && /^use[A-Z]/.test(exportedName);

            exports.push({
              name: exportedName,
              kind: 'reexport',
              isDefault: false,
              isHook,
              isComponent: declInfo?.returnsJSX || false,
            });
          }
        }
      }

      for (const key in node) {
        const child = node[key];
        if (Array.isArray(child)) {
          child.forEach(visit);
        } else if (child && typeof child === 'object') {
          visit(child);
        }
      }
    };

    visit(ast);
    return exports;
  }

  functionReturnsJSX(funcNode) {
    if (!funcNode) return false;

    const checkForJSX = (node) => {
      if (!node || typeof node !== 'object') return false;
      if (node.type === 'JSXElement' || node.type === 'JSXFragment') return true;

      for (const key in node) {
        const child = node[key];
        if (Array.isArray(child)) {
          if (child.some(checkForJSX)) return true;
        } else if (child && typeof child === 'object') {
          if (checkForJSX(child)) return true;
        }
      }
      return false;
    };


    if (funcNode.type === 'ArrowFunctionExpression' && funcNode.expression) {
      return checkForJSX(funcNode.body);
    }


    const checkReturns = (node) => {
      if (!node || typeof node !== 'object') return false;

      if (node.type === 'ReturnStatement' && node.argument) {
        if (checkForJSX(node.argument)) return true;
      }

      for (const key in node) {
        const child = node[key];
        if (Array.isArray(child)) {
          if (child.some(checkReturns)) return true;
        } else if (child && typeof child === 'object') {
          if (checkReturns(child)) return true;
        }
      }
      return false;
    };

    return checkReturns(funcNode.body);
  }

  classReturnsJSX(classNode) {
    if (!classNode?.body?.body) return false;

    for (const member of classNode.body.body) {
      if (member.type === 'MethodDefinition' &&
          member.key?.name === 'render' &&
          member.value) {
        return this.functionReturnsJSX(member.value);
      }
    }
    return false;
  }

  extractJSXElements(ast) {
    const elements = [];

    const visit = (node) => {
      if (!node || typeof node !== 'object') return;

      if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
        if (node.openingElement?.name) {
          const name = this.getJSXElementName(node.openingElement.name);

          if (name && /^[A-Z]/.test(name)) {
            elements.push({ name, loc: node.loc });
          }
        }
      }

      for (const key in node) {
        const child = node[key];
        if (Array.isArray(child)) {
          child.forEach(visit);
        } else if (child && typeof child === 'object') {
          visit(child);
        }
      }
    };

    visit(ast);
    return elements;
  }

  getJSXElementName(nameNode) {
    if (nameNode.type === 'JSXIdentifier') {
      return nameNode.name;
    }
    if (nameNode.type === 'JSXMemberExpression') {
      return `${this.getJSXElementName(nameNode.object)}.${nameNode.property?.name}`;
    }
    return null;
  }

  hasJSXReturn(ast) {
    let found = false;

    const checkForJSX = (node) => {
      if (!node || typeof node !== 'object') return false;
      if (node.type === 'JSXElement' || node.type === 'JSXFragment') return true;

      for (const key in node) {
        const child = node[key];
        if (Array.isArray(child)) {
          if (child.some(checkForJSX)) return true;
        } else if (child && typeof child === 'object') {
          if (checkForJSX(child)) return true;
        }
      }
      return false;
    };

    const visit = (node) => {
      if (!node || typeof node !== 'object') return;


      if (node.type === 'FunctionDeclaration' ||
          node.type === 'FunctionExpression' ||
          node.type === 'ArrowFunctionExpression') {


        const checkReturns = (n) => {
          if (!n || typeof n !== 'object') return;

          if (n.type === 'ReturnStatement' && n.argument) {
            if (checkForJSX(n.argument)) {
              found = true;
            }
          }


          if (node.type === 'ArrowFunctionExpression' &&
              node.expression &&
              checkForJSX(node.body)) {
            found = true;
          }

          for (const key in n) {
            const child = n[key];
            if (Array.isArray(child)) {
              child.forEach(checkReturns);
            } else if (child && typeof child === 'object') {
              checkReturns(child);
            }
          }
        };

        checkReturns(node.body);
      }

      for (const key in node) {
        const child = node[key];
        if (Array.isArray(child)) {
          child.forEach(visit);
        } else if (child && typeof child === 'object') {
          visit(child);
        }
      }
    };

    visit(ast);
    return found;
  }

  classifyFile(exports, hasJSXReturn, file) {
    const name = file.name.toLowerCase();


    if (hasJSXReturn) {
      return 'component';
    }


    if (name.includes('.test') || name.includes('.spec') ||
        file.relativePath.includes('__tests__')) {
      return 'test';
    }


    if (name.startsWith('use') || name.includes('.hook')) {
      return 'hook';
    }

    if (name.includes('util') || name.includes('helper')) {
      return 'util';
    }

    if (name.includes('constant') || name.includes('config')) {
      return 'constant';
    }

    if (name.includes('type') || name.includes('.d')) {
      return 'type';
    }

    if (name.includes('context')) {
      return 'context';
    }

    if (name.includes('style') || ['.css', '.scss', '.less'].includes(file.extension)) {
      return 'style';
    }

    if (name === 'index') {
      return 'barrel';
    }

    if (name === 'setupTests' || name === 'setup') {
      return 'test-setup';
    }

    return 'module';
  }
}

module.exports = ASTAnalyzer;
