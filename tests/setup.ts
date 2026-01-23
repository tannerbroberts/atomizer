import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';

export interface FixtureFile {
  relativePath: string;
  absolutePath: string;
  content: string;
  extension: string;
}

export interface Fixture {
  path: string;
  files: FixtureFile[];
  cleanup: () => void;
}

export async function createFixture(fixtureName: string): Promise<Fixture> {
  const fixturePath = path.join(__dirname, 'fixtures', 'default-exports', fixtureName);

  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Fixture not found: ${fixturePath}`);
  }

  const files: FixtureFile[] = [];

  function readDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        readDir(fullPath);
      } else if (entry.isFile() && !entry.name.startsWith('.') && entry.name !== 'README.md') {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const relativePath = path.relative(fixturePath, fullPath);
        const extension = path.extname(fullPath);

        files.push({
          relativePath,
          absolutePath: fullPath,
          content,
          extension,
        });
      }
    }
  }

  readDir(fixturePath);

  return {
    path: fixturePath,
    files,
    cleanup: () => {},
  };
}

export async function createTmpDir(): Promise<string> {
  const tmpPath = path.join(tmpdir(), 'atomizer-tests', uuidv4());
  fs.mkdirSync(tmpPath, { recursive: true });
  return tmpPath;
}

export function cleanupDir(dirPath: string) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

export async function runAtomizer(options: {
  srcPath: string;
  outputPath: string;
}): Promise<void> {
  const Atomizer = (await import('../src/Atomizer.js')).default;

  const atomizer = new Atomizer(options.srcPath, {
    verbose: false,
  });

  const traceResult = await atomizer.traceAllDependencies();
  await atomizer.execute(traceResult, options.outputPath, { verbose: false });
}

export function extractImports(fileContent: string): string[] {
  const imports: string[] = [];
  const importRegex = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;

  let match;
  while ((match = importRegex.exec(fileContent)) !== null) {
    imports.push(match[1]);
  }

  return imports;
}

export function serializeTraced(traced: Map<string, any>): any {
  const result: any = {};

  for (const [key, value] of traced.entries()) {
    result[key] = {
      declarationName: value.declaration?.name,
      filePath: value.declaration?.filePath,
      internalCount: value.internal?.size || 0,
      externalCount: value.external?.size || 0,
      external: Array.from(value.external || []),
    };
  }

  return result;
}
