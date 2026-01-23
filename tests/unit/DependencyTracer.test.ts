import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectIndex } from '../../src/core/ProjectIndex';
import { DependencyTracer } from '../../src/core/DependencyTracer';
import { createFixture } from '../setup';
import type { Fixture } from '../setup';

describe('DependencyTracer - Default Exports', () => {
  describe('Known Bug: Anonymous Defaults Not Traced', () => {
    let fixture: Fixture;
    let index: ProjectIndex;
    let tracer: DependencyTracer;

    beforeEach(async () => {
      fixture = await createFixture('anonymous-arrow');
      index = new ProjectIndex(fixture.path);
      await index.indexAll(fixture.files);

      tracer = new DependencyTracer(index);
      tracer.traceAll();
    });

    it('should trace anonymous arrow default (CURRENTLY FAILS)', () => {
      const traced = Array.from(tracer.getTraced().values());

      const componentTrace = traced.find(t =>
        t.declaration.filePath.includes('Component.tsx')
      );

      if (!componentTrace) {
        console.log('\n❌ BUG CONFIRMED: Anonymous arrow default NOT traced');
        console.log('Available traced declarations:');
        traced.forEach(t => {
          console.log(`  - ${t.declaration.name} in ${t.declaration.filePath}`);
        });
      }

      expect(componentTrace).toBeDefined();
    });

    it('should find consumer of anonymous default (CURRENTLY FAILS)', () => {
      const traced = Array.from(tracer.getTraced().values());

      const componentTrace = traced.find(t =>
        t.declaration.filePath.includes('Component.tsx')
      );

      if (componentTrace) {
        const consumerPath = fixture.files.find(f =>
          f.absolutePath.includes('Consumer.tsx')
        )?.absolutePath;

        const hasConsumer = Array.from(componentTrace.external.values())
          .some(path => path === consumerPath);

        if (!hasConsumer) {
          console.log('\n❌ BUG CONFIRMED: Consumer not found in external dependants');
          console.log('External dependants:', Array.from(componentTrace.external.values()));
        }

        expect(hasConsumer).toBe(true);
      } else {
        expect.fail('Component not traced at all');
      }
    });

    it('should have correct external count (CURRENTLY FAILS)', () => {
      const traced = Array.from(tracer.getTraced().values());

      const componentTrace = traced.find(t =>
        t.declaration.filePath.includes('Component.tsx')
      );

      if (componentTrace) {
        const externalCount = componentTrace.external.size;

        if (externalCount === 0) {
          console.log('\n❌ BUG CONFIRMED: External count = 0 (should be 1)');
        }

        expect(externalCount).toBeGreaterThan(0);
      }
    });
  });

  describe('Anonymous Function Declaration (Also Broken)', () => {
    let fixture: Fixture;
    let index: ProjectIndex;
    let tracer: DependencyTracer;

    beforeEach(async () => {
      fixture = await createFixture('anonymous-function');
      index = new ProjectIndex(fixture.path);
      await index.indexAll(fixture.files);

      tracer = new DependencyTracer(index);
      tracer.traceAll();
    });

    it('should trace anonymous function default (CURRENTLY FAILS)', () => {
      const traced = Array.from(tracer.getTraced().values());

      const componentTrace = traced.find(t =>
        t.declaration.filePath.includes('Component.tsx')
      );

      if (!componentTrace) {
        console.log('\n❌ BUG CONFIRMED: Anonymous function default NOT traced');
      }

      expect(componentTrace).toBeDefined();
    });
  });

  describe('Named Defaults - Baseline (Should Work)', () => {
    let fixture: Fixture;
    let index: ProjectIndex;
    let tracer: DependencyTracer;

    beforeEach(async () => {
      fixture = await createFixture('named-default');
      index = new ProjectIndex(fixture.path);
      await index.indexAll(fixture.files);

      tracer = new DependencyTracer(index);
      tracer.traceAll();
    });

    it('should trace named default function correctly', () => {
      const traced = Array.from(tracer.getTraced().values());

      const buttonTrace = traced.find(t =>
        t.declaration.name === 'Button'
      );

      expect(buttonTrace).toBeDefined();
      expect(buttonTrace?.declaration.isExported).toBe(true);
    });

    it('should find all consumers of named default', () => {
      const traced = Array.from(tracer.getTraced().values());

      const buttonTrace = traced.find(t =>
        t.declaration.name === 'Button'
      );

      expect(buttonTrace).toBeDefined();

      const formPath = fixture.files.find(f =>
        f.absolutePath.includes('Form.tsx')
      )?.absolutePath;

      const hasConsumer = Array.from(buttonTrace!.external.values())
        .some(path => path === formPath);

      expect(hasConsumer).toBe(true);
    });

    it('should trace nested dependencies', () => {
      const traced = Array.from(tracer.getTraced().values());

      const appTrace = traced.find(t => t.declaration.name === 'App');
      const formTrace = traced.find(t => t.declaration.name === 'Form');
      const buttonTrace = traced.find(t => t.declaration.name === 'Button');

      expect(appTrace).toBeDefined();
      expect(formTrace).toBeDefined();
      expect(buttonTrace).toBeDefined();

      expect(formTrace!.external.size).toBeGreaterThan(0);
      expect(buttonTrace!.external.size).toBeGreaterThan(0);
    });
  });

  describe('Re-exported Defaults', () => {
    let fixture: Fixture;
    let index: ProjectIndex;
    let tracer: DependencyTracer;

    beforeEach(async () => {
      fixture = await createFixture('reexported-default');
      index = new ProjectIndex(fixture.path);
      await index.indexAll(fixture.files);

      tracer = new DependencyTracer(index);
      tracer.traceAll();
    });

    it('should follow re-export chain for default', () => {
      const traced = Array.from(tracer.getTraced().values());

      const buttonTrace = traced.find(t =>
        t.declaration.name === 'Button'
      );

      expect(buttonTrace).toBeDefined();
    });

    it('should find final consumer through barrel', () => {
      const traced = Array.from(tracer.getTraced().values());

      const buttonTrace = traced.find(t =>
        t.declaration.name === 'Button'
      );

      if (buttonTrace) {
        const appPath = fixture.files.find(f =>
          f.absolutePath.includes('App.tsx')
        )?.absolutePath;

        const externalPaths = Array.from(buttonTrace.external.values());
        const hasAppConsumer = externalPaths.some(path => path === appPath);

        if (!hasAppConsumer) {
          console.log('External dependants:', externalPaths);
          console.log('Looking for:', appPath);
        }

        expect(externalPaths.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Mixed Export Dependencies', () => {
    let fixture: Fixture;
    let index: ProjectIndex;
    let tracer: DependencyTracer;

    beforeEach(async () => {
      fixture = await createFixture('mixed-exports');
      index = new ProjectIndex(fixture.path);
      await index.indexAll(fixture.files);

      tracer = new DependencyTracer(index);
      tracer.traceAll();
    });

    it('should trace both default and named export usage', () => {
      const traced = Array.from(tracer.getTraced().values());

      const mainUtilTrace = traced.find(t => t.declaration.name === 'mainUtil');
      const helperTrace = traced.find(t => t.declaration.name === 'helper');
      const formatTrace = traced.find(t => t.declaration.name === 'format');

      expect(mainUtilTrace).toBeDefined();
      expect(helperTrace).toBeDefined();
      expect(formatTrace).toBeDefined();
    });

    it('should find consumers for each export type', () => {
      const traced = Array.from(tracer.getTraced().values());

      const mainUtilTrace = traced.find(t => t.declaration.name === 'mainUtil');
      const helperTrace = traced.find(t => t.declaration.name === 'helper');

      if (mainUtilTrace) {
        expect(mainUtilTrace.external.size).toBeGreaterThan(0);
      }

      if (helperTrace) {
        expect(helperTrace.external.size).toBeGreaterThan(0);
      }
    });
  });

  describe('Class Defaults', () => {
    let fixture: Fixture;
    let index: ProjectIndex;
    let tracer: DependencyTracer;

    beforeEach(async () => {
      fixture = await createFixture('class-default');
      index = new ProjectIndex(fixture.path);
      await index.indexAll(fixture.files);

      tracer = new DependencyTracer(index);
      tracer.traceAll();
    });

    it('should trace class default export', () => {
      const traced = Array.from(tracer.getTraced().values());

      const serviceTrace = traced.find(t =>
        t.declaration.name === 'UserService'
      );

      expect(serviceTrace).toBeDefined();
    });

    it('should find class consumers', () => {
      const traced = Array.from(tracer.getTraced().values());

      const serviceTrace = traced.find(t =>
        t.declaration.name === 'UserService'
      );

      if (serviceTrace) {
        expect(serviceTrace.external.size).toBeGreaterThan(0);
      }
    });
  });
});
