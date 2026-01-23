export = SymbolTracer;
declare class SymbolTracer {
    constructor(srcPath: any, analysisResults: any);
    srcPath: any;
    analysisResults: any;
    fileMap: Map<any, any>;
    /**
     * Trace symbols in a file and find their consumers
     * @param {string} filePath - Absolute path to the file
     * @returns {Array} - List of symbols and their consumers
     */
    trace(filePath: string): any[];
    collectTopLevelSymbols(ast: any, content: any): ({
        name: any;
        type: string;
        isExported: boolean;
        isDefault: boolean;
        range: any;
        code: any;
        localName?: undefined;
    } | {
        name: any;
        localName: any;
        type: string;
        isExported: boolean;
        isDefault: boolean;
        range: any;
        code?: undefined;
    })[];
    findInternalConsumers(symbol: any, allSymbols: any, content: any): any[];
    findExternalConsumers(symbol: any, filePath: any): string[];
    isIdentifierUsed(code: any, identifier: any): boolean;
}
