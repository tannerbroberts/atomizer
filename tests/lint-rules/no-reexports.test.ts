import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ReexportInliner } from '../../src/core/ReexportInliner';
import { v4 as uuidv4 } from 'uuid';

describe('ReexportInliner - Iteration 5', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = path.join('/tmp', `atomizer-test-${uuidv4()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('Iteration 5: Detection phase', () => {
    it('should detect re-exports in GridEditorContext', async () => {
      // CREATE FIXTURE: GridEditorContext pattern
      const contextDir = path.join(tmpDir, 'src/contexts/GridEditorContext');
      fs.mkdirSync(contextDir, { recursive: true });

      // index.ts with re-exports (violates lint rule)
      fs.writeFileSync(
        path.join(contextDir, 'index.ts'),
        `export { GridEditorProvider, useGridEditor } from './GridEditorContext';
export type { GridEditorTool, SectionType, GridLayout } from './GridEditorContext';
`
      );

      // GridEditorContext.tsx with actual implementation
      fs.writeFileSync(
        path.join(contextDir, 'GridEditorContext.tsx'),
        `import React, { createContext } from 'react';

export type GridEditorTool = 'brush' | 'eraser';
export type SectionType = 'editor' | 'preview';
export type GridLayout = { rows: number; cols: number };

export const GridEditorProvider: React.FC = ({ children }) => {
  return <div>{children}</div>;
};

export const useGridEditor = () => {
  return { tool: 'brush' as GridEditorTool };
};
`
      );

      // RUN DETECTION
      const inliner = new ReexportInliner(path.join(tmpDir, 'src'));
      const reexports = await inliner.detectReexports();

      // VERIFY
      expect(reexports.length).toBe(1);
      expect(reexports[0].filePath).toContain('GridEditorContext/index.ts');
      expect(reexports[0].reexportCount).toBe(5); // 2 regular + 3 type exports
    });

    it('should detect multiple re-export patterns', async () => {
      // Test TetrixContext pattern
      const tetrixDir = path.join(tmpDir, 'src/contexts/TetrixContext');
      fs.mkdirSync(tetrixDir, { recursive: true });

      fs.writeFileSync(
        path.join(tetrixDir, 'index.ts'),
        `export { TetrixProvider } from './TetrixProvider';
export { useTetrixStateContext, useTetrixDispatchContext } from './TetrixContext';
`
      );

      fs.writeFileSync(
        path.join(tetrixDir, 'TetrixProvider.tsx'),
        `export const TetrixProvider = () => <div />;`
      );

      fs.writeFileSync(
        path.join(tetrixDir, 'TetrixContext.ts'),
        `export const useTetrixStateContext = () => ({});
export const useTetrixDispatchContext = () => ({});`
      );

      const inliner = new ReexportInliner(path.join(tmpDir, 'src'));
      const reexports = await inliner.detectReexports();

      expect(reexports.length).toBe(1);
      expect(reexports[0].reexportCount).toBe(3);
      expect(reexports[0].sourceFiles).toContain('TetrixProvider');
      expect(reexports[0].sourceFiles).toContain('TetrixContext');
    });
  });

  describe('Iteration 6: Inlining phase', () => {
    it('should inline simple re-exports into index.ts', async () => {
      // CREATE FIXTURE
      const contextDir = path.join(tmpDir, 'src/contexts/SimpleContext');
      fs.mkdirSync(contextDir, { recursive: true });

      // index.ts with re-export
      fs.writeFileSync(
        path.join(contextDir, 'index.ts'),
        `export { SimpleProvider } from './SimpleProvider';
`
      );

      // SimpleProvider.tsx with implementation
      fs.writeFileSync(
        path.join(contextDir, 'SimpleProvider.tsx'),
        `import React from 'react';

export const SimpleProvider: React.FC = ({ children }) => {
  return <div>{children}</div>;
};
`
      );

      // RUN INLINE
      const inliner = new ReexportInliner(path.join(tmpDir, 'src'));
      await inliner.inlineReexports();

      // VERIFY - File should be renamed to .tsx since it contains JSX
      const tsxPath = path.join(contextDir, 'index.tsx');
      expect(fs.existsSync(tsxPath)).toBe(true);

      const indexContent = fs.readFileSync(tsxPath, 'utf-8');

      // Should have inlined declaration
      expect(indexContent).toContain('export const SimpleProvider');
      expect(indexContent).toContain('React.FC');

      // Should NOT have re-export
      expect(indexContent).not.toContain("from './SimpleProvider'");

      // Source file should still exist (for now, we don't delete)
      expect(fs.existsSync(path.join(contextDir, 'SimpleProvider.tsx'))).toBe(true);
    });

    it('should handle type exports', async () => {
      const contextDir = path.join(tmpDir, 'src/contexts/TypeContext');
      fs.mkdirSync(contextDir, { recursive: true });

      fs.writeFileSync(
        path.join(contextDir, 'index.ts'),
        `export { TypeProvider } from './TypeContext';
export type { ContextType } from './TypeContext';
`
      );

      fs.writeFileSync(
        path.join(contextDir, 'TypeContext.ts'),
        `export type ContextType = { value: string };

export const TypeProvider = () => null;
`
      );

      const inliner = new ReexportInliner(path.join(tmpDir, 'src'));
      await inliner.inlineReexports();

      const indexContent = fs.readFileSync(path.join(contextDir, 'index.ts'), 'utf-8');

      // Should have both type and value exports
      expect(indexContent).toContain('export type ContextType');
      expect(indexContent).toContain('export const TypeProvider');
      expect(indexContent).not.toContain("from './TypeContext'");
    });

    it('should handle React function components without double export keywords', async () => {
      // CREATE FIXTURE: Real-world React component pattern
      const contextDir = path.join(tmpDir, 'src/contexts/RealContext');
      fs.mkdirSync(contextDir, { recursive: true });

      fs.writeFileSync(
        path.join(contextDir, 'index.ts'),
        `export { RealProvider } from './RealProvider';
`
      );

      // Simulate real TetrixProvider.tsx structure
      fs.writeFileSync(
        path.join(contextDir, 'RealProvider.tsx'),
        `import { useReducer } from 'react';

export function RealProvider({ children }: { readonly children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <div>{children}</div>;
}
`
      );

      const inliner = new ReexportInliner(path.join(tmpDir, 'src'));
      await inliner.inlineReexports();

      // File should be renamed to .tsx since it contains JSX
      const tsxPath = path.join(contextDir, 'index.tsx');
      expect(fs.existsSync(tsxPath)).toBe(true);

      const indexContent = fs.readFileSync(tsxPath, 'utf-8');

      // Should have function declaration
      expect(indexContent).toContain('export function RealProvider');

      // Should NOT have double export keywords
      expect(indexContent).not.toContain('export const export function');
      expect(indexContent).not.toContain('export export');

      // Should have the actual function body
      expect(indexContent).toContain('useReducer');
      expect(indexContent).toContain('children');
    });
  });
});
