import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectIndex } from '../../src/core/ProjectIndex';
import { createFixture } from '../setup';
import type { Fixture } from '../setup';

describe('ProjectIndex - Default Exports', () => {
  describe('Named Default Exports', () => {
    let fixture: Fixture;
    let index: ProjectIndex;

    beforeEach(async () => {
      fixture = await createFixture('named-default');
      index = new ProjectIndex(fixture.path);
      await index.indexAll(fixture.files);
    });

    it('should index named default function', () => {
      const declarations = Array.from(index.getDeclarations().values());
      const buttonDecl = declarations.find(d => d.name === 'Button');

      expect(buttonDecl).toBeDefined();
      expect(buttonDecl?.isExported).toBe(true);
      expect(buttonDecl?.filePath).toContain('Button.tsx');
    });

    it('should index export with correct local/exported names', () => {
      const exports = Array.from(index.getExports().values());
      const buttonExports = exports.filter(e => e.filePath.includes('Button.tsx'));

      const defaultExport = buttonExports.find(e =>
        e.exportedNames.some(exp => exp.exported === 'default')
      );
      expect(defaultExport).toBeDefined();

      const defaultExportName = defaultExport?.exportedNames.find(e => e.exported === 'default');
      expect(defaultExportName?.local).toBe('Button');
      expect(defaultExportName?.exported).toBe('default');
    });

    it('should index all three components', () => {
      const declarations = Array.from(index.getDeclarations().values());
      const names = declarations.map(d => d.name);

      expect(names).toContain('Button');
      expect(names).toContain('Form');
      expect(names).toContain('App');
    });
  });

  describe('Anonymous Arrow Function Exports', () => {
    let fixture: Fixture;
    let index: ProjectIndex;

    beforeEach(async () => {
      fixture = await createFixture('anonymous-arrow');
      index = new ProjectIndex(fixture.path);
      await index.indexAll(fixture.files);
    });

    it('should index anonymous arrow function default', () => {
      const declarations = Array.from(index.getDeclarations().values());

      const componentDecl = declarations.find(d =>
        d.filePath.includes('Component.tsx')
      );

      expect(componentDecl).toBeDefined();
      expect(componentDecl?.isExported).toBe(true);

      console.log('Anonymous arrow default name:', componentDecl?.name);
    });

    it('should have default export entry', () => {
      const exports = Array.from(index.getExports().values());
      const componentExports = exports.filter(e => e.filePath.includes('Component.tsx'));

      const defaultExport = componentExports.find(e =>
        e.exportedNames.some(exp => exp.exported === 'default')
      );
      expect(defaultExport).toBeDefined();

      const defaultExportName = defaultExport?.exportedNames.find(e => e.exported === 'default');
      console.log('Anonymous arrow export local name:', defaultExportName?.local);
    });
  });

  describe('Anonymous Function Declaration Exports', () => {
    let fixture: Fixture;
    let index: ProjectIndex;

    beforeEach(async () => {
      fixture = await createFixture('anonymous-function');
      index = new ProjectIndex(fixture.path);
      await index.indexAll(fixture.files);
    });

    it('should index anonymous function declaration', () => {
      const declarations = Array.from(index.getDeclarations().values());

      const componentDecl = declarations.find(d =>
        d.filePath.includes('Component.tsx')
      );

      expect(componentDecl).toBeDefined();
      console.log('Anonymous function default name:', componentDecl?.name);
    });
  });

  describe('Re-exported Defaults', () => {
    let fixture: Fixture;
    let index: ProjectIndex;

    beforeEach(async () => {
      fixture = await createFixture('reexported-default');
      index = new ProjectIndex(fixture.path);
      await index.indexAll(fixture.files);
    });

    it('should use identifier name for const + default export', () => {
      const declarations = Array.from(index.getDeclarations().values());
      const buttonDecl = declarations.find(d => d.name === 'Button');

      expect(buttonDecl).toBeDefined();
      expect(buttonDecl?.isExported).toBe(true);
      expect(buttonDecl?.filePath).toContain('Button.tsx');
    });

    it('should index barrel re-export', () => {
      const exports = Array.from(index.getExports().values());
      const indexExports = exports.filter(e => e.filePath.includes('index.ts'));

      expect(indexExports.length).toBeGreaterThan(0);
    });
  });

  describe('Mixed Exports', () => {
    let fixture: Fixture;
    let index: ProjectIndex;

    beforeEach(async () => {
      fixture = await createFixture('mixed-exports');
      index = new ProjectIndex(fixture.path);
      await index.indexAll(fixture.files);
    });

    it('should index both default and named exports', () => {
      const exports = Array.from(index.getExports().values());
      const utilExports = exports.filter(e => e.filePath.includes('utils.ts'));

      const hasDefaultExport = utilExports.some(e =>
        e.exportedNames.some(exp => exp.exported === 'default')
      );
      const hasNamedExports = utilExports.some(e =>
        e.exportedNames.some(exp => exp.exported !== 'default')
      );

      expect(hasDefaultExport).toBe(true);
      expect(hasNamedExports).toBe(true);
    });

    it('should track all declarations', () => {
      const declarations = Array.from(index.getDeclarations().values());
      const utilsDecls = declarations.filter(d => d.filePath.includes('utils.ts'));

      const names = utilsDecls.map(d => d.name);
      expect(names).toContain('helper');
      expect(names).toContain('format');
      expect(names).toContain('mainUtil');
    });
  });

  describe('Class Defaults', () => {
    let fixture: Fixture;
    let index: ProjectIndex;

    beforeEach(async () => {
      fixture = await createFixture('class-default');
      index = new ProjectIndex(fixture.path);
      await index.indexAll(fixture.files);
    });

    it('should extract class name from default export', () => {
      const declarations = Array.from(index.getDeclarations().values());
      const serviceDecl = declarations.find(d => d.name === 'UserService');

      expect(serviceDecl).toBeDefined();
      expect(serviceDecl?.isExported).toBe(true);
      expect(serviceDecl?.filePath).toContain('Service.ts');
    });

    it('should index class methods', () => {
      const declarations = Array.from(index.getDeclarations().values());
      const methods = declarations.filter(d => d.filePath.includes('Service.ts'));

      const methodNames = methods.map(d => d.name);
      expect(methodNames).toContain('getUser');
      expect(methodNames).toContain('saveUser');
    });
  });

  describe('Object Defaults', () => {
    let fixture: Fixture;
    let index: ProjectIndex;

    beforeEach(async () => {
      fixture = await createFixture('object-default');
      index = new ProjectIndex(fixture.path);
      await index.indexAll(fixture.files);
    });

    it('should handle object literal default exports', () => {
      const exports = Array.from(index.getExports().values());
      const configExports = exports.filter(e => e.filePath.toLowerCase().includes('config.ts'));

      const defaultExport = configExports.find(e =>
        e.exportedNames.some(exp => exp.exported === 'default')
      );
      expect(defaultExport).toBeDefined();

      const defaultExportName = defaultExport?.exportedNames.find(e => e.exported === 'default');
      console.log('Object default export local name:', defaultExportName?.local);
    });
  });
});
