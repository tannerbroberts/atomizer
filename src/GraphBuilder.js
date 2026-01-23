class Graph {
  constructor(name) {
    this.name = name;
    this.nodes = new Map();
    this.edges = new Map();
    this.reverseEdges = new Map();
  }

  addNode(id, data) {
    this.nodes.set(id, data);
    if (!this.edges.has(id)) {
      this.edges.set(id, new Set());
    }
    if (!this.reverseEdges.has(id)) {
      this.reverseEdges.set(id, new Set());
    }
  }

  addEdge(from, to, data = {}) {
    if (!this.edges.has(from)) {
      this.edges.set(from, new Set());
    }
    if (!this.reverseEdges.has(to)) {
      this.reverseEdges.set(to, new Set());
    }

    this.edges.get(from).add(to);
    this.reverseEdges.get(to).add(from);
  }

  getNode(id) {
    return this.nodes.get(id);
  }

  getChildren(id) {
    return Array.from(this.edges.get(id) || []);
  }

  getParents(id) {
    return Array.from(this.reverseEdges.get(id) || []);
  }

  getRoots() {
    const roots = [];
    for (const [id] of this.nodes) {
      const parents = this.reverseEdges.get(id);
      if (!parents || parents.size === 0) {
        roots.push(id);
      }
    }
    return roots;
  }

  getLeaves() {
    const leaves = [];
    for (const [id] of this.nodes) {
      const children = this.edges.get(id);
      if (!children || children.size === 0) {
        leaves.push(id);
      }
    }
    return leaves;
  }

  get nodeCount() {
    return this.nodes.size;
  }

  get edgeCount() {
    let count = 0;
    for (const [, targets] of this.edges) {
      count += targets.size;
    }
    return count;
  }


  hasCycle() {
    const visited = new Set();
    const recursionStack = new Set();

    const dfs = (node) => {
      visited.add(node);
      recursionStack.add(node);

      const children = this.edges.get(node) || new Set();
      for (const child of children) {
        if (!visited.has(child)) {
          if (dfs(child)) return true;
        } else if (recursionStack.has(child)) {
          return true;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const [node] of this.nodes) {
      if (!visited.has(node)) {
        if (dfs(node)) return true;
      }
    }

    return false;
  }


  topologicalSort() {
    const visited = new Set();
    const result = [];

    const dfs = (node) => {
      if (visited.has(node)) return;
      visited.add(node);

      const children = this.edges.get(node) || new Set();
      for (const child of children) {
        dfs(child);
      }

      result.unshift(node);
    };

    for (const [node] of this.nodes) {
      dfs(node);
    }

    return result;
  }


  getAncestors(nodeId) {
    const ancestors = new Set();
    const queue = [...(this.reverseEdges.get(nodeId) || [])];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!ancestors.has(current)) {
        ancestors.add(current);
        const parents = this.reverseEdges.get(current) || new Set();
        for (const parent of parents) {
          queue.push(parent);
        }
      }
    }

    return ancestors;
  }


  getDescendants(nodeId) {
    const descendants = new Set();
    const queue = [...(this.edges.get(nodeId) || [])];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!descendants.has(current)) {
        descendants.add(current);
        const children = this.edges.get(current) || new Set();
        for (const child of children) {
          queue.push(child);
        }
      }
    }

    return descendants;
  }
}

class GraphBuilder {
  constructor(analysisResults) {
    this.files = analysisResults;
    this.fileMap = new Map();


    for (const file of analysisResults) {
      this.fileMap.set(file.filePath, file);
    }
  }

  build() {
    const renderTree = this.buildRenderTree();
    const dependencyGraph = this.buildDependencyGraph();

    return { renderTree, dependencyGraph };
  }

  buildRenderTree() {
    const tree = new Graph('RenderTree');
    const components = this.files.filter(f => f.classification === 'component');


    for (const comp of components) {
      tree.addNode(comp.filePath, {
        name: comp.name,
        filePath: comp.filePath,
        classification: comp.classification,
      });
    }


    const importNameToFile = this.buildImportNameMap(components);


    for (const comp of components) {
      for (const jsx of comp.jsxElements) {

        const importedFrom = this.resolveJSXToImport(comp, jsx.name, importNameToFile);

        if (importedFrom && tree.nodes.has(importedFrom)) {
          tree.addEdge(comp.filePath, importedFrom);
        }
      }
    }


    if (tree.hasCycle()) {
      console.warn('Warning: Render tree has cycles, which may indicate circular component rendering');
    }

    return tree;
  }

  buildImportNameMap(components) {
    const map = new Map();

    for (const comp of components) {

      map.set(comp.name, comp.filePath);


      for (const exp of comp.exports) {
        if (exp.name && exp.name !== 'default') {
          map.set(exp.name, comp.filePath);
        }
      }
    }

    return map;
  }

  resolveJSXToImport(file, jsxName, importNameToFile) {

    for (const imp of file.imports) {
      for (const spec of imp.specifiers) {
        if (spec.local === jsxName || spec.imported === jsxName) {

          if (imp.resolvedPath && this.fileMap.has(imp.resolvedPath)) {

            const resolvedFile = this.fileMap.get(imp.resolvedPath);
            if (resolvedFile?.classification === 'barrel') {
              const actualPath = this.followBarrelReexport(resolvedFile, jsxName);
              if (actualPath) return actualPath;
            }
            return imp.resolvedPath;
          }
        }
      }


      if (imp.specifiers.some(s => s.type === 'ImportDefaultSpecifier' && s.local === jsxName)) {
        if (imp.resolvedPath && this.fileMap.has(imp.resolvedPath)) {
          const resolvedFile = this.fileMap.get(imp.resolvedPath);
          if (resolvedFile?.classification === 'barrel') {
            const actualPath = this.followBarrelReexport(resolvedFile, jsxName);
            if (actualPath) return actualPath;
          }
          return imp.resolvedPath;
        }
      }
    }


    return importNameToFile.get(jsxName) || null;
  }

  /**
   * Follow barrel re-exports to find the actual file that exports the given name.
   */
  followBarrelReexport(barrelFile, exportName, visited = new Set()) {
    if (visited.has(barrelFile.filePath)) return null;
    visited.add(barrelFile.filePath);

    for (const imp of barrelFile.imports) {

      const hasName = imp.specifiers.some(s =>
        s.local === exportName || s.imported === exportName
      );


      const isWildcard = imp.isReexport && imp.specifiers.length === 0;

      if (hasName || isWildcard) {
        if (imp.resolvedPath && this.fileMap.has(imp.resolvedPath)) {
          const targetFile = this.fileMap.get(imp.resolvedPath);


          if (targetFile.classification === 'component') {
            return imp.resolvedPath;
          }


          if (targetFile.classification === 'barrel') {
            const result = this.followBarrelReexport(targetFile, exportName, visited);
            if (result) return result;
          }


          return imp.resolvedPath;
        }
      }
    }

    return null;
  }

  buildDependencyGraph() {
    const graph = new Graph('DependencyGraph');


    for (const file of this.files) {
      graph.addNode(file.filePath, {
        name: file.name,
        filePath: file.filePath,
        classification: file.classification,
      });
    }


    for (const file of this.files) {
      for (const imp of file.imports) {
        if (imp.resolvedPath && this.fileMap.has(imp.resolvedPath)) {
          graph.addEdge(file.filePath, imp.resolvedPath);
        }
      }
    }

    return graph;
  }
}

module.exports = GraphBuilder;
