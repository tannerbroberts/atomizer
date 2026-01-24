import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ImportPathNormalizer } from '../../src/core/ImportPathNormalizer';
import { v4 as uuidv4 } from 'uuid';

describe('ImportPathNormalizer - Iteration 1', () => {
  let tmpDir: string;

  beforeEach(() => {
    // Create temporary test directory
    tmpDir = path.join('/tmp', `atomizer-test-${uuidv4()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('Iteration 2: Barrel file creation', () => {
    it('should create barrel file in Shared folder', async () => {
      const editorDir = path.join(tmpDir, 'src/main/App/components/GridEditor/EditorGridTile');
      const sharedDir = path.join(tmpDir, 'src/main/Shared');

      fs.mkdirSync(editorDir, { recursive: true });
      fs.mkdirSync(path.join(sharedDir, 'BlockVisual'), { recursive: true });

      fs.writeFileSync(
        path.join(editorDir, 'index.tsx'),
        `import { BlockVisual } from "../../../../Shared/BlockVisual";

export const EditorGridTile = () => {
  return <BlockVisual />;
};
`
      );

      fs.writeFileSync(
        path.join(sharedDir, 'BlockVisual/index.tsx'),
        `export const BlockVisual = () => <div>Block</div>;
`
      );

      const normalizer = new ImportPathNormalizer(path.join(tmpDir, 'src'));
      await normalizer.normalize();

      // Verify barrel file was created
      const barrelPath = path.join(sharedDir, 'index.ts');
      expect(fs.existsSync(barrelPath)).toBe(true);

      const barrelContent = fs.readFileSync(barrelPath, 'utf-8');
      expect(barrelContent).toContain("export * from './BlockVisual'");
    });
  });

  describe('Iteration 1: Basic import rewriting', () => {
    it('should normalize ../../../Shared/BlockVisual to ../../../Shared', async () => {
      // CREATE TEST FIXTURE
      // Simulate tetrix-game structure:
      // src/main/App/components/GridEditor/EditorGridTile/index.tsx
      // src/main/Shared/BlockVisual/index.tsx

      const editorDir = path.join(tmpDir, 'src/main/App/components/GridEditor/EditorGridTile');
      const sharedDir = path.join(tmpDir, 'src/main/Shared/BlockVisual');

      fs.mkdirSync(editorDir, { recursive: true });
      fs.mkdirSync(sharedDir, { recursive: true });

      // Write source files
      fs.writeFileSync(
        path.join(editorDir, 'index.tsx'),
        `import { BlockVisual } from "../../../../Shared/BlockVisual";

export const EditorGridTile = () => {
  return <BlockVisual />;
};
`
      );

      fs.writeFileSync(
        path.join(sharedDir, 'index.tsx'),
        `export const BlockVisual = () => <div>Block</div>;
`
      );

      // RUN NORMALIZER
      const normalizer = new ImportPathNormalizer(path.join(tmpDir, 'src'));
      await normalizer.normalize();

      // VERIFY
      const content = fs.readFileSync(path.join(editorDir, 'index.tsx'), 'utf-8');

      // Expected: import should now point to Shared folder, not BlockVisual subfolder
      expect(content).toContain('from "../../../../Shared"');
      expect(content).not.toContain('from "../../../../Shared/BlockVisual"');
    });

    it('should handle multiple imports from same folder', async () => {
      // Test case: EditorGridTile imports both BlockVisual and Tile from Shared
      const editorDir = path.join(tmpDir, 'src/main/App/components/GridEditor/EditorGridTile');
      const sharedDir = path.join(tmpDir, 'src/main/Shared');

      fs.mkdirSync(editorDir, { recursive: true });
      fs.mkdirSync(path.join(sharedDir, 'BlockVisual'), { recursive: true });
      fs.mkdirSync(path.join(sharedDir, 'Tile'), { recursive: true });

      fs.writeFileSync(
        path.join(editorDir, 'index.tsx'),
        `import { BlockVisual } from "../../../../Shared/BlockVisual";
import { Tile } from "../../../../Shared/Tile";

export const EditorGridTile = () => {
  return <><BlockVisual /><Tile /></>;
};
`
      );

      fs.writeFileSync(
        path.join(sharedDir, 'BlockVisual/index.tsx'),
        `export const BlockVisual = () => <div>Block</div>;`
      );

      fs.writeFileSync(
        path.join(sharedDir, 'Tile/index.tsx'),
        `export const Tile = () => <div>Tile</div>;`
      );

      const normalizer = new ImportPathNormalizer(path.join(tmpDir, 'src'));
      await normalizer.normalize();

      const content = fs.readFileSync(path.join(editorDir, 'index.tsx'), 'utf-8');

      // Should combine into single import
      expect(content).toContain('from "../../../../Shared"');
      expect(content).toMatch(/import\s+\{[^}]*BlockVisual[^}]*,\s*Tile[^}]*\}\s+from/);
    });
  });
});
