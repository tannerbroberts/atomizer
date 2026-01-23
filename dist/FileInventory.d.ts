export = FileInventory;
declare class FileInventory {
    constructor(srcPath: any, options?: {});
    srcPath: any;
    includeTests: boolean;
    scan(): Promise<{
        relativePath: string;
        absolutePath: string;
        extension: string;
        name: string;
    }[]>;
}
