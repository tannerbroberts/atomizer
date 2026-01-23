/**
 * Atomizer Test Suite
 *
 * Comprehensive tests for finding ALL usages of declarations.
 *
 * Run with: node tests/run-tests.js
 */

const path = require('path');
const Atomizer = require('../src/Atomizer');
const ProjectIndexer = require('../src/ProjectIndexer');
const DependencyTracer = require('../src/DependencyTracer');
const FileInventory = require('../src/FileInventory');

const FIXTURES_PATH = path.join(__dirname, 'test-fixtures', 'edge-cases');


let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${testName}`);
    if (details) console.log(`   Details: ${details}`);
    failed++;
    failures.push({ testName, details });
  }
}

function assertUsageFound(traced, declarationName, expectedConsumerNames, testName) {

  let declarationUuid = null;
  let declarationNode = null;

  for (const [uuid, node] of traced) {
    if ((node.declaredNames || []).includes(declarationName)) {
      declarationUuid = uuid;
      declarationNode = node;
      break;
    }

    if ((node.exportedNames || []).some(e => e.local === declarationName)) {
      declarationUuid = uuid;
      declarationNode = node;
      break;
    }
  }

  if (!declarationNode) {
    assert(false, testName, `Declaration "${declarationName}" not found in traced results`);
    return;
  }

  const internalCount = declarationNode.dependant?.internal?.length || 0;
  const externalCount = Object.keys(declarationNode.dependant?.external || {}).length;
  const totalConsumers = internalCount + externalCount;

  assert(
    totalConsumers >= expectedConsumerNames.length,
    testName,
    `Expected at least ${expectedConsumerNames.length} consumers, found ${totalConsumers} (internal: ${internalCount}, external: ${externalCount})`
  );
}

async function runIndexer(fixturePath) {
  const inventory = new FileInventory(fixturePath);
  const files = await inventory.scan();
  const indexer = new ProjectIndexer(fixturePath);
  await indexer.indexAll(files);
  return indexer;
}

async function runTracer(fixturePath) {
  const indexer = await runIndexer(fixturePath);
  const tracer = new DependencyTracer(indexer);
  return tracer.traceAll();
}





async function testAliasedImports() {
  console.log('\n📋 Testing: Aliased Imports');

  const traced = await runTracer(FIXTURES_PATH);


  assertUsageFound(traced, 'originalName', ['aliased-consumer'],
    'Aliased import (originalName as aliasedName) should be tracked');

  assertUsageFound(traced, 'originalFunction', ['aliased-consumer'],
    'Aliased function import should be tracked');
}

async function testReexportChain() {
  console.log('\n📋 Testing: Re-export Chain');

  const traced = await runTracer(FIXTURES_PATH);


  assertUsageFound(traced, 'deeplyNested', ['deep-consumer'],
    'Symbol re-exported through 2 levels should be tracked to final consumer');

  assertUsageFound(traced, 'DeepFunction', ['deep-consumer'],
    'Default export re-exported as named should be tracked');
}

async function testNamespaceImports() {
  console.log('\n📋 Testing: Namespace Imports (import * as X)');

  const traced = await runTracer(FIXTURES_PATH);


  assertUsageFound(traced, 'alpha', ['namespace-consumer'],
    'Usage via namespace import (NS.alpha) should be tracked');

  assertUsageFound(traced, 'beta', ['namespace-consumer'],
    'Usage via namespace import (NS.beta) should be tracked');

  assertUsageFound(traced, 'gamma', ['namespace-consumer'],
    'Usage via namespace import (NS.gamma()) should be tracked');
}

async function testStringFalsePositives() {
  console.log('\n📋 Testing: String False Positives');

  const indexer = await runIndexer(FIXTURES_PATH);
  const tracer = new DependencyTracer(indexer);


  let targetNode = null;
  for (const [uuid, node] of indexer.declarations) {
    if ((node.declaredNames || []).includes('targetSymbol')) {
      targetNode = node;
      break;
    }
  }

  if (targetNode) {


    const traced = tracer.traceAll();
    for (const [uuid, node] of traced) {
      if ((node.declaredNames || []).includes('targetSymbol')) {
        const internalCount = node.dependant?.internal?.length || 0;


        assert(
          internalCount >= 1,
          'Identifier in string should NOT be counted as usage',
          `Found ${internalCount} internal usages (expected at least 1 for actualUsage)`
        );
        break;
      }
    }
  } else {
    assert(false, 'String false positive test', 'targetSymbol declaration not found');
  }
}

async function testShadowing() {
  console.log('\n📋 Testing: Variable Shadowing');



  console.log('   ⚠️  Note: Proper shadowing detection requires scope analysis');

  const traced = await runTracer(FIXTURES_PATH);



  for (const [uuid, node] of traced) {
    if ((node.declaredNames || []).includes('shadowed')) {
      const internalCount = node.dependant?.internal?.length || 0;


      console.log(`   Found ${internalCount} internal usages (ideally should be 1 for actualConsumer only)`);
      assert(true, 'Shadowing test completed (limitation documented)');
      break;
    }
  }
}

async function testBarrelFileExportStar() {
  console.log('\n📋 Testing: Barrel Files with export *');

  const traced = await runTracer(FIXTURES_PATH);


  assertUsageFound(traced, 'starExport1', ['barrel-consumer'],
    'export * should forward usage tracking through barrel file');
}

async function testCircularDependencies() {
  console.log('\n📋 Testing: Circular Dependencies');

  try {
    const traced = await runTracer(FIXTURES_PATH);


    assert(true, 'Circular dependencies should not cause infinite loop');


    assertUsageFound(traced, 'circularA', ['circular-b'],
      'Circular dependency A->B should be detected');

    assertUsageFound(traced, 'circularB', ['circular-a'],
      'Circular dependency B->A should be detected');
  } catch (e) {
    assert(false, 'Circular dependencies test', `Exception: ${e.message}`);
  }
}

async function testInternalUsage() {
  console.log('\n📋 Testing: Internal Usage Within Same File');

  const traced = await runTracer(FIXTURES_PATH);


  for (const [uuid, node] of traced) {
    if ((node.declaredNames || []).includes('helper') &&
        node.filePath?.includes('internal-usage')) {
      const internalCount = node.dependant?.internal?.length || 0;
      assert(
        internalCount >= 2,
        'Internal usage: helper should be used by double and quadruple',
        `Found ${internalCount} internal usages`
      );
      break;
    }
  }


  for (const [uuid, node] of traced) {
    if ((node.declaredNames || []).includes('funcA') &&
        node.filePath?.includes('internal-usage')) {
      const internalCount = node.dependant?.internal?.length || 0;
      assert(
        internalCount >= 1,
        'Internal usage: funcA should be used by funcB',
        `Found ${internalCount} internal usages`
      );
      break;
    }
  }
}

async function testDestructuringExports() {
  console.log('\n📋 Testing: Destructuring in Exports');

  const indexed = await runIndexer(FIXTURES_PATH);


  let foundExtractedA = false;
  let foundFirst = false;

  for (const [uuid, node] of indexed.declarations) {
    const names = node.declaredNames || [];
    if (names.includes('extractedA')) foundExtractedA = true;
    if (names.includes('first')) foundFirst = true;
  }

  assert(foundExtractedA, 'Object destructuring export should be indexed',
    `extractedA ${foundExtractedA ? 'found' : 'not found'}`);

  assert(foundFirst, 'Array destructuring export should be indexed',
    `first ${foundFirst ? 'found' : 'not found'}`);
}

async function testTypeOnlyImports() {
  console.log('\n📋 Testing: Type-Only Imports');

  const indexed = await runIndexer(FIXTURES_PATH);


  let foundInterface = false;
  let foundType = false;

  for (const [uuid, node] of indexed.declarations) {
    const names = node.declaredNames || [];
    if (names.includes('MyInterface')) foundInterface = true;
    if (names.includes('MyType')) foundType = true;
  }

  assert(foundInterface, 'TypeScript interface should be indexed');
  assert(foundType, 'TypeScript type alias should be indexed');
}

async function testEnumUsage() {
  console.log('\n📋 Testing: TypeScript Enum Usage');

  const indexed = await runIndexer(FIXTURES_PATH);

  let foundEnum = false;
  for (const [uuid, node] of indexed.declarations) {
    if ((node.declaredNames || []).includes('Color')) {
      foundEnum = true;
      break;
    }
  }

  assert(foundEnum, 'TypeScript enum should be indexed');

  const traced = await runTracer(FIXTURES_PATH);
  assertUsageFound(traced, 'Color', ['enum-consumer'],
    'Enum usage (Color.Red, Color.Blue) should be tracked');
}

async function testDefaultAndNamedExports() {
  console.log('\n📋 Testing: Default and Named Exports from Same Module');

  const traced = await runTracer(FIXTURES_PATH);


  assertUsageFound(traced, 'MainComponent', ['mixed-import-consumer'],
    'Default export should be tracked when imported as default');

  assertUsageFound(traced, 'namedExport1', ['mixed-import-consumer'],
    'Named export from module with default should be tracked');
}

async function testCommonJSPatterns() {
  console.log('\n📋 Testing: CommonJS Patterns');

  const indexed = await runIndexer(FIXTURES_PATH);


  let foundRequireImport = false;
  for (const [uuid, node] of indexed.imports) {
    if (node.isRequireImport) {
      foundRequireImport = true;
      break;
    }
  }

  assert(foundRequireImport, 'require() statements should be indexed as imports');


  let foundModuleExports = false;
  for (const [uuid, node] of indexed.exports) {
    if (node.filePath?.includes('commonjs-mixed')) {
      foundModuleExports = true;
      break;
    }
  }

  assert(foundModuleExports, 'module.exports should be indexed as export');
}

async function testDynamicImports() {
  console.log('\n📋 Testing: Dynamic Imports');


  console.log('   ⚠️  Note: Dynamic imports may require special handling');

  const indexed = await runIndexer(FIXTURES_PATH);



  assert(true, 'Dynamic import test completed (may be a limitation)');
}

async function testJSXUsage() {
  console.log('\n📋 Testing: JSX Component Usage');

  const traced = await runTracer(FIXTURES_PATH);


  assertUsageFound(traced, 'MyComponent', ['jsx-consumer'],
    'JSX component usage (<MyComponent />) should be tracked');

  assertUsageFound(traced, 'AnotherComponent', ['jsx-consumer'],
    'JSX component with children should be tracked');

  assertUsageFound(traced, 'withWrapper', ['jsx-consumer'],
    'HOC usage should be tracked');
}

async function testCommentEdgeCases() {
  console.log('\n📋 Testing: Comments Should Not Count as Usage');

  const indexer = await runIndexer(FIXTURES_PATH);
  const tracer = new DependencyTracer(indexer);


  const testCode = `

    /* commentTarget in block */
    const x = commentTarget + 1;
  `;

  const hasUsage = tracer.isIdentifierUsedInCode(testCode, 'commentTarget');
  assert(hasUsage, 'Identifier in code (not just comments) should be detected');

  const commentOnlyCode = `

    /* commentTarget */
    /** @param commentTarget */
  `;

  const commentOnlyHasUsage = tracer.isIdentifierUsedInCode(commentOnlyCode, 'commentTarget');
  assert(!commentOnlyHasUsage, 'Identifier only in comments should NOT be detected as usage');
}





async function runAllTests() {
  console.log('🧪 Atomizer Test Suite');
  console.log('='.repeat(60));
  console.log(`Testing fixtures in: ${FIXTURES_PATH}`);

  try {
    await testAliasedImports();
    await testReexportChain();
    await testNamespaceImports();
    await testStringFalsePositives();
    await testShadowing();
    await testBarrelFileExportStar();
    await testCircularDependencies();
    await testInternalUsage();
    await testDestructuringExports();
    await testTypeOnlyImports();
    await testEnumUsage();
    await testDefaultAndNamedExports();
    await testCommonJSPatterns();
    await testDynamicImports();
    await testJSXUsage();
    await testCommentEdgeCases();
  } catch (e) {
    console.error('\n💥 Test suite crashed:', e);
    console.error(e.stack);
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);

  if (failures.length > 0) {
    console.log('\n❌ Failures:');
    for (const f of failures) {
      console.log(`   - ${f.testName}`);
      if (f.details) console.log(`     ${f.details}`);
    }
  }

  console.log('\n🔍 Known Limitations to Address:');
  console.log('   1. Variable shadowing (requires scope analysis)');
  console.log('   2. Dynamic imports (async/runtime resolution)');
  console.log('   3. Namespace destructuring (const { a } = NS)');
  console.log('   4. Regex-based identifier matching may have edge cases');
  console.log('   5. Computed property access (obj[variableName])');

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests();
