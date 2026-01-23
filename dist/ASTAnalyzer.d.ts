export = ASTAnalyzer;
declare class ASTAnalyzer {
    constructor(srcPath: any, options?: {});
    srcPath: any;
    options: {};
    aliasMap: {};
    baseUrl: string | null;
    loadAliases(): {
        aliasMap: {};
        baseUrl: string | null;
    };
    analyzeAll(files: any): Promise<any[]>;
    analyzeFile(file: any): Promise<any>;
    extractImports(ast: any, filePath: any): any[];
    resolveModulePath(source: any, fromDir: any): string | null;
    extractExports(ast: any, fileContent: any): any[];
    functionReturnsJSX(funcNode: any): boolean;
    classReturnsJSX(classNode: any): boolean;
    extractJSXElements(ast: any): any[];
    getJSXElementName(nameNode: any): any;
    hasJSXReturn(ast: any): boolean;
    classifyFile(exports: any, hasJSXReturn: any, file: any): "component" | "barrel" | "test-setup" | "test" | "hook" | "util" | "constant" | "type" | "context" | "style" | "module";
}
