/**
 * Creative Stress Tests
 * 
 * Unusual and edge-case patterns that might break usage tracking
 */

const path = require('path');
const ProjectIndexer = require('../src/ProjectIndexer');
const DependencyTracer = require('../src/DependencyTracer');
const FileInventory = require('../src/FileInventory');

// Create test fixtures inline for precise control
const fs = require('fs');

const TEMP_DIR = path.join(__dirname, 'test-fixtures', 'stress-tests');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

let testCount = 0;
let passCount = 0;
let bugCount = 0;

function writeTestFile(name, content) {
  const filePath = path.join(TEMP_DIR, name);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

function cleanupTestFiles() {
  const files = fs.readdirSync(TEMP_DIR);
  for (const file of files) {
    fs.unlinkSync(path.join(TEMP_DIR, file));
  }
}

async function runTest(name, setupFn, testFn) {
  testCount++;
  console.log(`\n🧪 Test ${testCount}: ${name}`);
  
  try {
    // Setup creates test files
    const files = await setupFn();
    
    // Run indexer on temp dir
    const inventory = new FileInventory(TEMP_DIR);
    const scannedFiles = await inventory.scan();
    const indexer = new ProjectIndexer(TEMP_DIR);
    await indexer.indexAll(scannedFiles);
    const tracer = new DependencyTracer(indexer);
    
    // Run test assertions
    const result = await testFn(indexer, tracer);
    
    if (result.passed) {
      console.log(`   ✅ PASS: ${result.message}`);
      passCount++;
    } else {
      console.log(`   🐛 BUG: ${result.message}`);
      bugCount++;
    }
    
    return result;
  } catch (e) {
    console.log(`   💥 CRASH: ${e.message}`);
    bugCount++;
    return { passed: false, message: e.message };
  }
}

// ============================================================================
// TEST CASES
// ============================================================================

async function testComputedPropertyAccess() {
  return runTest('Computed property access', 
    async () => {
      writeTestFile('source.ts', `
        export const config = {
          apiKey: 'secret',
          endpoint: 'https://api.example.com',
        };
      `);
      
      writeTestFile('consumer.ts', `
        import { config } from './source';
        
        const key = 'apiKey';
        // Computed access - should this trace back?
        const value = config[key];
        
        // Dynamic key from function
        function getKey(): keyof typeof config {
          return 'endpoint';
        }
        const endpoint = config[getKey()];
      `);
    },
    async (indexer, tracer) => {
      const traced = tracer.traceAll();
      
      let configDecl = null;
      for (const [uuid, node] of indexer.declarations) {
        if ((node.declaredNames || []).includes('config')) {
          configDecl = traced.get(uuid);
          break;
        }
      }
      
      const hasExternalConsumer = Object.keys(configDecl?.dependant?.external || {}).length > 0;
      
      return {
        passed: hasExternalConsumer,
        message: hasExternalConsumer 
          ? 'Computed property access detected as usage'
          : 'Computed property access might not track specific properties'
      };
    }
  );
}

async function testSpreadOperator() {
  return runTest('Spread operator usage',
    async () => {
      writeTestFile('source.ts', `
        export const baseConfig = { a: 1, b: 2 };
        export const additionalConfig = { c: 3 };
      `);
      
      writeTestFile('consumer.ts', `
        import { baseConfig, additionalConfig } from './source';
        
        // Spread usage
        const merged = { ...baseConfig, ...additionalConfig };
        
        // Array spread with function
        const arr = [baseConfig, additionalConfig];
        const flat = [...arr];
      `);
    },
    async (indexer, tracer) => {
      const traced = tracer.traceAll();
      
      let baseDecl = null;
      for (const [uuid, node] of indexer.declarations) {
        if ((node.declaredNames || []).includes('baseConfig')) {
          baseDecl = traced.get(uuid);
          break;
        }
      }
      
      const hasExternalConsumer = Object.keys(baseDecl?.dependant?.external || {}).length > 0;
      
      return {
        passed: hasExternalConsumer,
        message: hasExternalConsumer 
          ? 'Spread operator usage tracked'
          : 'Spread operator usage not detected'
      };
    }
  );
}

async function testAsyncAwaitPatterns() {
  return runTest('Async/await patterns',
    async () => {
      writeTestFile('source.ts', `
        export async function fetchData() {
          return { data: 'test' };
        }
        
        export const asyncArrow = async () => {
          return 'arrow';
        };
      `);
      
      writeTestFile('consumer.ts', `
        import { fetchData, asyncArrow } from './source';
        
        async function main() {
          // Various await patterns
          const data = await fetchData();
          const result = await asyncArrow();
          
          // Chained
          const chained = (await fetchData()).data;
          
          // In array
          const all = await Promise.all([fetchData(), asyncArrow()]);
        }
      `);
    },
    async (indexer, tracer) => {
      const traced = tracer.traceAll();
      
      let fetchDecl = null;
      for (const [uuid, node] of indexer.declarations) {
        if ((node.declaredNames || []).includes('fetchData')) {
          fetchDecl = traced.get(uuid);
          break;
        }
      }
      
      const hasExternalConsumer = Object.keys(fetchDecl?.dependant?.external || {}).length > 0;
      
      return {
        passed: hasExternalConsumer,
        message: hasExternalConsumer 
          ? 'Async function usage tracked'
          : 'Async function usage not detected'
      };
    }
  );
}

async function testDecoratorPatterns() {
  return runTest('TypeScript decorator patterns',
    async () => {
      writeTestFile('decorators.ts', `
        export function Component(config: any) {
          return function(target: any) {
            target.config = config;
          };
        }
        
        export function Injectable() {
          return function(target: any) {};
        }
      `);
      
      writeTestFile('consumer.ts', `
        import { Component, Injectable } from './decorators';
        
        @Component({ selector: 'app' })
        @Injectable()
        class MyClass {}
      `);
    },
    async (indexer, tracer) => {
      const traced = tracer.traceAll();
      
      let componentDecl = null;
      for (const [uuid, node] of indexer.declarations) {
        if ((node.declaredNames || []).includes('Component')) {
          componentDecl = traced.get(uuid);
          break;
        }
      }
      
      const hasExternalConsumer = Object.keys(componentDecl?.dependant?.external || {}).length > 0;
      
      return {
        passed: hasExternalConsumer,
        message: hasExternalConsumer 
          ? 'Decorator usage tracked'
          : 'Decorator usage (@Component) might not be detected'
      };
    }
  );
}

async function testTaggedTemplateLiterals() {
  return runTest('Tagged template literals',
    async () => {
      writeTestFile('source.ts', `
        export function css(strings: TemplateStringsArray, ...values: any[]) {
          return strings.join('');
        }
        
        export function html(strings: TemplateStringsArray, ...values: any[]) {
          return strings.join('');
        }
      `);
      
      writeTestFile('consumer.ts', `
        import { css, html } from './source';
        
        // Tagged template usage
        const styles = css\`
          color: red;
          font-size: 16px;
        \`;
        
        const template = html\`<div>\${styles}</div>\`;
      `);
    },
    async (indexer, tracer) => {
      const traced = tracer.traceAll();
      
      let cssDecl = null;
      for (const [uuid, node] of indexer.declarations) {
        if ((node.declaredNames || []).includes('css')) {
          cssDecl = traced.get(uuid);
          break;
        }
      }
      
      const hasExternalConsumer = Object.keys(cssDecl?.dependant?.external || {}).length > 0;
      
      return {
        passed: hasExternalConsumer,
        message: hasExternalConsumer 
          ? 'Tagged template usage tracked'
          : 'Tagged template (css`...`) might not be detected'
      };
    }
  );
}

async function testOptionalChaining() {
  return runTest('Optional chaining usage',
    async () => {
      writeTestFile('source.ts', `
        export const maybe = {
          deeply: {
            nested: {
              value: 42
            }
          }
        };
        
        export function maybeFunc() {
          return { result: 'ok' };
        }
      `);
      
      writeTestFile('consumer.ts', `
        import { maybe, maybeFunc } from './source';
        
        // Optional chaining
        const value = maybe?.deeply?.nested?.value;
        const result = maybeFunc?.()?.result;
        
        // Nullish coalescing
        const withDefault = maybe?.deeply?.nested?.value ?? 0;
      `);
    },
    async (indexer, tracer) => {
      const traced = tracer.traceAll();
      
      let maybeDecl = null;
      for (const [uuid, node] of indexer.declarations) {
        if ((node.declaredNames || []).includes('maybe')) {
          maybeDecl = traced.get(uuid);
          break;
        }
      }
      
      const hasExternalConsumer = Object.keys(maybeDecl?.dependant?.external || {}).length > 0;
      
      return {
        passed: hasExternalConsumer,
        message: hasExternalConsumer 
          ? 'Optional chaining usage tracked'
          : 'Optional chaining (?.notation) might not be detected'
      };
    }
  );
}

async function testProxyAndReflect() {
  return runTest('Proxy and Reflect patterns',
    async () => {
      writeTestFile('source.ts', `
        export const originalObject = {
          name: 'test',
          getValue() { return this.name; }
        };
      `);
      
      writeTestFile('consumer.ts', `
        import { originalObject } from './source';
        
        // Wrapped in Proxy
        const proxied = new Proxy(originalObject, {
          get(target, prop) {
            console.log('Accessing:', prop);
            return Reflect.get(target, prop);
          }
        });
        
        const name = proxied.name;
      `);
    },
    async (indexer, tracer) => {
      const traced = tracer.traceAll();
      
      let objDecl = null;
      for (const [uuid, node] of indexer.declarations) {
        if ((node.declaredNames || []).includes('originalObject')) {
          objDecl = traced.get(uuid);
          break;
        }
      }
      
      const hasExternalConsumer = Object.keys(objDecl?.dependant?.external || {}).length > 0;
      
      return {
        passed: hasExternalConsumer,
        message: hasExternalConsumer 
          ? 'Proxy-wrapped usage tracked'
          : 'Usage through Proxy wrapper not detected'
      };
    }
  );
}

async function testGeneratorFunctions() {
  return runTest('Generator function usage',
    async () => {
      writeTestFile('source.ts', `
        export function* numberGenerator() {
          yield 1;
          yield 2;
          yield 3;
        }
        
        export async function* asyncGenerator() {
          yield await Promise.resolve(1);
        }
      `);
      
      writeTestFile('consumer.ts', `
        import { numberGenerator, asyncGenerator } from './source';
        
        // Generator usage
        const gen = numberGenerator();
        console.log(gen.next());
        
        // Spread
        const allNumbers = [...numberGenerator()];
        
        // For-of
        for (const n of numberGenerator()) {
          console.log(n);
        }
      `);
    },
    async (indexer, tracer) => {
      const traced = tracer.traceAll();
      
      let genDecl = null;
      for (const [uuid, node] of indexer.declarations) {
        if ((node.declaredNames || []).includes('numberGenerator')) {
          genDecl = traced.get(uuid);
          break;
        }
      }
      
      const hasExternalConsumer = Object.keys(genDecl?.dependant?.external || {}).length > 0;
      
      return {
        passed: hasExternalConsumer,
        message: hasExternalConsumer 
          ? 'Generator function usage tracked'
          : 'Generator function usage not detected'
      };
    }
  );
}

async function testClassExpressionPatterns() {
  return runTest('Class expression patterns',
    async () => {
      writeTestFile('source.ts', `
        export const MyClass = class {
          static value = 42;
          method() { return 'hello'; }
        };
        
        export const createClass = () => class extends Array {
          first() { return this[0]; }
        };
      `);
      
      writeTestFile('consumer.ts', `
        import { MyClass, createClass } from './source';
        
        // Class expression usage
        const instance = new MyClass();
        console.log(MyClass.value);
        
        // Factory
        const DynamicClass = createClass();
        const arr = new DynamicClass(1, 2, 3);
      `);
    },
    async (indexer, tracer) => {
      const traced = tracer.traceAll();
      
      let classDecl = null;
      for (const [uuid, node] of indexer.declarations) {
        if ((node.declaredNames || []).includes('MyClass')) {
          classDecl = traced.get(uuid);
          break;
        }
      }
      
      const hasExternalConsumer = Object.keys(classDecl?.dependant?.external || {}).length > 0;
      
      return {
        passed: hasExternalConsumer,
        message: hasExternalConsumer 
          ? 'Class expression usage tracked'
          : 'Class expression usage not detected'
      };
    }
  );
}

async function testSymbolsAndIterators() {
  return runTest('Symbols and custom iterators',
    async () => {
      writeTestFile('source.ts', `
        export const mySymbol = Symbol('mySymbol');
        
        export const iterableObj = {
          [Symbol.iterator]: function* () {
            yield 1;
            yield 2;
          }
        };
      `);
      
      writeTestFile('consumer.ts', `
        import { mySymbol, iterableObj } from './source';
        
        // Symbol usage
        const obj = { [mySymbol]: 'value' };
        console.log(obj[mySymbol]);
        
        // Iterable usage
        for (const x of iterableObj) {
          console.log(x);
        }
      `);
    },
    async (indexer, tracer) => {
      const traced = tracer.traceAll();
      
      let symbolDecl = null;
      for (const [uuid, node] of indexer.declarations) {
        if ((node.declaredNames || []).includes('mySymbol')) {
          symbolDecl = traced.get(uuid);
          break;
        }
      }
      
      const hasExternalConsumer = Object.keys(symbolDecl?.dependant?.external || {}).length > 0;
      
      return {
        passed: hasExternalConsumer,
        message: hasExternalConsumer 
          ? 'Symbol usage tracked'
          : 'Symbol as computed property not detected'
      };
    }
  );
}

async function testPrivateFields() {
  return runTest('Class private fields (#)',
    async () => {
      writeTestFile('source.ts', `
        export class SecureClass {
          #privateField = 'secret';
          
          getPrivate() {
            return this.#privateField;
          }
        }
      `);
      
      writeTestFile('consumer.ts', `
        import { SecureClass } from './source';
        
        const instance = new SecureClass();
        console.log(instance.getPrivate());
      `);
    },
    async (indexer, tracer) => {
      const traced = tracer.traceAll();
      
      let classDecl = null;
      for (const [uuid, node] of indexer.declarations) {
        if ((node.declaredNames || []).includes('SecureClass')) {
          classDecl = traced.get(uuid);
          break;
        }
      }
      
      const hasExternalConsumer = Object.keys(classDecl?.dependant?.external || {}).length > 0;
      
      return {
        passed: hasExternalConsumer,
        message: hasExternalConsumer 
          ? 'Class with private fields usage tracked'
          : 'Class with private fields (#) not detected'
      };
    }
  );
}

async function testUnicodeIdentifiers() {
  return runTest('Unicode identifiers',
    async () => {
      writeTestFile('source.ts', `
        export const π = 3.14159;
        export const 你好 = 'hello in Chinese';
        export const _$money = 100;
        export const \u0041BC = 'unicode escape'; // ABC
      `);
      
      writeTestFile('consumer.ts', `
        import { π, 你好, _$money } from './source';
        
        console.log(π * 2);
        console.log(你好);
        console.log(_$money);
      `);
    },
    async (indexer, tracer) => {
      const traced = tracer.traceAll();
      
      let piDecl = null;
      for (const [uuid, node] of indexer.declarations) {
        if ((node.declaredNames || []).includes('π')) {
          piDecl = traced.get(uuid);
          break;
        }
      }
      
      if (!piDecl) {
        return { passed: false, message: 'Unicode identifier π not indexed' };
      }
      
      const hasExternalConsumer = Object.keys(piDecl?.dependant?.external || {}).length > 0;
      
      return {
        passed: hasExternalConsumer,
        message: hasExternalConsumer 
          ? 'Unicode identifier usage tracked'
          : 'Unicode identifier (π) not detected'
      };
    }
  );
}

async function testVeryLongReexportChain() {
  return runTest('Very long re-export chain (10 levels)',
    async () => {
      // Create a chain of 10 re-exports
      writeTestFile('level0.ts', `export const deepValue = 'deep';`);
      
      for (let i = 1; i <= 9; i++) {
        writeTestFile(`level${i}.ts`, `export { deepValue } from './level${i-1}';`);
      }
      
      writeTestFile('final-consumer.ts', `
        import { deepValue } from './level9';
        console.log(deepValue);
      `);
    },
    async (indexer, tracer) => {
      const traced = tracer.traceAll();
      
      let deepDecl = null;
      for (const [uuid, node] of indexer.declarations) {
        if ((node.declaredNames || []).includes('deepValue') &&
            node.filePath?.includes('level0')) {
          deepDecl = traced.get(uuid);
          break;
        }
      }
      
      if (!deepDecl) {
        return { passed: false, message: 'deepValue declaration not found' };
      }
      
      const externalConsumers = Object.keys(deepDecl?.dependant?.external || {});
      
      // Check if final-consumer is found
      let foundFinal = false;
      for (const consumerUuid of externalConsumers) {
        const consumerNode = indexer.project.get(consumerUuid);
        if (consumerNode?.filePath?.includes('final-consumer')) {
          foundFinal = true;
          break;
        }
      }
      
      return {
        passed: foundFinal,
        message: foundFinal 
          ? `10-level re-export chain tracked (${externalConsumers.length} consumers)`
          : `Final consumer not found through 10-level chain (found ${externalConsumers.length} consumers)`
      };
    }
  );
}

async function testMultipleSameNameDifferentFiles() {
  return runTest('Same name exported from multiple files',
    async () => {
      writeTestFile('moduleA.ts', `export const sameName = 'from A';`);
      writeTestFile('moduleB.ts', `export const sameName = 'from B';`);
      
      writeTestFile('consumer.ts', `
        import { sameName as fromA } from './moduleA';
        import { sameName as fromB } from './moduleB';
        
        console.log(fromA, fromB);
      `);
    },
    async (indexer, tracer) => {
      const traced = tracer.traceAll();
      
      // Find both declarations
      let declA = null, declB = null;
      for (const [uuid, node] of indexer.declarations) {
        if ((node.declaredNames || []).includes('sameName')) {
          if (node.filePath?.includes('moduleA')) declA = traced.get(uuid);
          if (node.filePath?.includes('moduleB')) declB = traced.get(uuid);
        }
      }
      
      if (!declA || !declB) {
        return { passed: false, message: 'Could not find both declarations' };
      }
      
      const aHasConsumer = Object.keys(declA?.dependant?.external || {}).length > 0;
      const bHasConsumer = Object.keys(declB?.dependant?.external || {}).length > 0;
      
      return {
        passed: aHasConsumer && bHasConsumer,
        message: aHasConsumer && bHasConsumer
          ? 'Both same-named exports tracked independently'
          : `Module A tracked: ${aHasConsumer}, Module B tracked: ${bHasConsumer}`
      };
    }
  );
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runAllTests() {
  console.log('🎯 Creative Stress Test Suite');
  console.log('='.repeat(60));
  console.log('Testing unusual patterns that might break usage tracking\n');
  
  try {
    await testComputedPropertyAccess();
    await testSpreadOperator();
    await testAsyncAwaitPatterns();
    await testDecoratorPatterns();
    await testTaggedTemplateLiterals();
    await testOptionalChaining();
    await testProxyAndReflect();
    await testGeneratorFunctions();
    await testClassExpressionPatterns();
    await testSymbolsAndIterators();
    await testPrivateFields();
    await testUnicodeIdentifiers();
    await testVeryLongReexportChain();
    await testMultipleSameNameDifferentFiles();
  } catch (e) {
    console.error('\n💥 Test suite crashed:', e.message);
    console.error(e.stack);
  }
  
  // Cleanup
  console.log('\n🧹 Cleaning up test files...');
  cleanupTestFiles();
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Results: ${passCount}/${testCount} passed, ${bugCount} issues found`);
  
  if (bugCount > 0) {
    console.log(`\n⚠️  ${bugCount} patterns may not be fully tracked.`);
    console.log('   Consider whether these patterns are important for your use case.');
  }
  
  process.exit(bugCount > 0 ? 1 : 0);
}

runAllTests();
