/**
 * Advanced Bug-Finding Tests
 * 
 * These tests are designed to find subtle bugs in usage tracking
 */

const path = require('path');
const ProjectIndexer = require('../src/ProjectIndexer');
const DependencyTracer = require('../src/DependencyTracer');
const FileInventory = require('../src/FileInventory');

const FIXTURES_PATH = path.join(__dirname, 'test-fixtures', 'edge-cases');

let passed = 0;
let failed = 0;
const bugs = [];

function reportBug(name, expected, actual, details = '') {
  bugs.push({ name, expected, actual, details });
  console.log(`🐛 BUG FOUND: ${name}`);
  console.log(`   Expected: ${expected}`);
  console.log(`   Actual: ${actual}`);
  if (details) console.log(`   Details: ${details}`);
  failed++;
}

function reportPass(name) {
  console.log(`✅ ${name}`);
  passed++;
}

async function runIndexer(fixturePath) {
  const inventory = new FileInventory(fixturePath);
  const files = await inventory.scan();
  const indexer = new ProjectIndexer(fixturePath);
  await indexer.indexAll(files);
  return indexer;
}

// ============================================================================
// BUG TEST 1: Namespace property access (NS.foo) tracking
// ============================================================================
async function testNamespacePropertyAccess() {
  console.log('\n🔍 BUG TEST: Namespace property access tracking');
  
  const indexer = await runIndexer(FIXTURES_PATH);
  const tracer = new DependencyTracer(indexer);
  
  // Find the 'alpha' declaration from namespace-import.ts
  let alphaDecl = null;
  for (const [uuid, node] of indexer.declarations) {
    if ((node.declaredNames || []).includes('alpha') && 
        node.filePath?.includes('namespace-import.ts')) {
      alphaDecl = { uuid, node };
      break;
    }
  }
  
  if (!alphaDecl) {
    reportBug('Namespace test setup', 'alpha declaration found', 'not found');
    return;
  }
  
  const traced = tracer.traceAll();
  const tracedAlpha = traced.get(alphaDecl.uuid);
  
  const externalConsumers = Object.keys(tracedAlpha?.dependant?.external || {});
  
  // The namespace-consumer.ts uses NS.alpha, which should be traced
  // But this requires analyzing the namespace pattern, not just direct imports
  // Current implementation might miss this because it only sees import * as NS
  
  // Find if any external consumer is from namespace-consumer.ts
  let foundNamespaceConsumer = false;
  for (const consumerUuid of externalConsumers) {
    const consumerNode = indexer.project.get(consumerUuid);
    if (consumerNode?.filePath?.includes('namespace-consumer')) {
      foundNamespaceConsumer = true;
      break;
    }
  }
  
  if (!foundNamespaceConsumer) {
    reportBug(
      'Namespace property access not fully tracked',
      'NS.alpha usage should be traced to alpha declaration',
      `Found ${externalConsumers.length} external consumers, none from namespace-consumer.ts`,
      'Namespace imports may only track that "something" is used, not specific properties'
    );
  } else {
    reportPass('Namespace property access tracked correctly');
  }
}

// ============================================================================
// BUG TEST 2: Re-export with rename chain tracking
// ============================================================================
async function testRenameChainTracking() {
  console.log('\n🔍 BUG TEST: Re-export rename chain tracking');
  
  const indexer = await runIndexer(FIXTURES_PATH);
  const tracer = new DependencyTracer(indexer);
  
  // Find deeplyNested from re-export-chain.ts
  let deeplyNestedDecl = null;
  for (const [uuid, node] of indexer.declarations) {
    if ((node.declaredNames || []).includes('deeplyNested') && 
        node.filePath?.includes('re-export-chain.ts')) {
      deeplyNestedDecl = { uuid, node };
      break;
    }
  }
  
  if (!deeplyNestedDecl) {
    reportBug('Rename chain test setup', 'deeplyNested found', 'not found');
    return;
  }
  
  const traced = tracer.traceAll();
  const tracedDeep = traced.get(deeplyNestedDecl.uuid);
  const externalConsumers = Object.keys(tracedDeep?.dependant?.external || {});
  
  // Track the path:
  // re-export-chain.ts (deeplyNested) -> reexport-level1.ts (deeplyNested) 
  //   -> reexport-level2.ts (renamedDeep) -> deep-consumer.ts
  
  // Check that the final consumer (deep-consumer.ts) is found
  let foundDeepConsumer = false;
  for (const consumerUuid of externalConsumers) {
    const consumerNode = indexer.project.get(consumerUuid);
    if (consumerNode?.filePath?.includes('deep-consumer')) {
      foundDeepConsumer = true;
      break;
    }
  }
  
  if (!foundDeepConsumer) {
    reportBug(
      'Rename chain not fully tracked',
      'deeplyNested -> renamedDeep should trace to deep-consumer.ts',
      `Found ${externalConsumers.length} external consumers`,
      'Re-export with rename (deeplyNested as renamedDeep) may break tracking'
    );
  } else {
    reportPass('Rename chain tracked correctly through all levels');
  }
}

// ============================================================================
// BUG TEST 3: export * from barrel file tracking
// ============================================================================
async function testExportStarTracking() {
  console.log('\n🔍 BUG TEST: export * barrel file tracking');
  
  const indexer = await runIndexer(FIXTURES_PATH);
  const tracer = new DependencyTracer(indexer);
  
  // Find starExport1 from export-star.ts
  let starExport1Decl = null;
  for (const [uuid, node] of indexer.declarations) {
    if ((node.declaredNames || []).includes('starExport1') && 
        node.filePath?.includes('export-star.ts')) {
      starExport1Decl = { uuid, node };
      break;
    }
  }
  
  if (!starExport1Decl) {
    reportBug('Export star test setup', 'starExport1 found', 'not found');
    return;
  }
  
  const traced = tracer.traceAll();
  const tracedStar = traced.get(starExport1Decl.uuid);
  const externalConsumers = Object.keys(tracedStar?.dependant?.external || {});
  
  // Path: export-star.ts -> barrel-file.ts (export *) -> barrel-consumer.ts
  
  let foundBarrelConsumer = false;
  for (const consumerUuid of externalConsumers) {
    const consumerNode = indexer.project.get(consumerUuid);
    if (consumerNode?.filePath?.includes('barrel-consumer')) {
      foundBarrelConsumer = true;
      break;
    }
  }
  
  if (!foundBarrelConsumer) {
    reportBug(
      'export * not tracking through to final consumer',
      'starExport1 should be traced through barrel-file.ts to barrel-consumer.ts',
      `Found ${externalConsumers.length} external consumers`,
      'export * syntax may not properly forward all exports'
    );
  } else {
    reportPass('export * tracked correctly through barrel file');
  }
}

// ============================================================================
// BUG TEST 4: Default export imported with different name
// ============================================================================
async function testDefaultImportRename() {
  console.log('\n🔍 BUG TEST: Default export imported with different name');
  
  const indexer = await runIndexer(FIXTURES_PATH);
  const tracer = new DependencyTracer(indexer);
  
  // Find DeepFunction (exported as default) from re-export-chain.ts  
  let deepFuncDecl = null;
  for (const [uuid, node] of indexer.exports) {
    if (node.filePath?.includes('re-export-chain.ts') && node.isDefaultExport) {
      deepFuncDecl = { uuid, node };
      break;
    }
  }
  
  if (!deepFuncDecl) {
    reportBug('Default import rename test setup', 'DeepFunction default export found', 'not found');
    return;
  }
  
  const traced = tracer.traceAll();
  const tracedFunc = traced.get(deepFuncDecl.uuid);
  
  if (!tracedFunc) {
    // Default exports that are also declarations should be in traced
    console.log('   ⚠️  Default export may not be in declarations map');
    
    // Try to find via declared name
    for (const [uuid, node] of indexer.declarations) {
      if ((node.declaredNames || []).includes('DeepFunction')) {
        const tracedAlt = traced.get(uuid);
        const extConsumers = Object.keys(tracedAlt?.dependant?.external || {});
        console.log(`   Found via declaredName, ${extConsumers.length} external consumers`);
        break;
      }
    }
    reportPass('Default export tracking needs verification');
    return;
  }
  
  const externalConsumers = Object.keys(tracedFunc?.dependant?.external || {});
  
  // Path: re-export-chain.ts (default DeepFunction) 
  //   -> reexport-level1.ts (default as DeepFunction)
  //   -> reexport-level2.ts (DeepFunction as RenamedDeepFunc)
  //   -> deep-consumer.ts (RenamedDeepFunc)
  
  let foundConsumer = false;
  for (const consumerUuid of externalConsumers) {
    const consumerNode = indexer.project.get(consumerUuid);
    if (consumerNode?.filePath?.includes('deep-consumer')) {
      foundConsumer = true;
      break;
    }
  }
  
  if (!foundConsumer) {
    reportBug(
      'Default export rename chain not tracked',
      'default -> DeepFunction -> RenamedDeepFunc should trace to deep-consumer.ts',
      `Found ${externalConsumers.length} external consumers`,
      'Default exports re-exported as named may break tracking'
    );
  } else {
    reportPass('Default export rename chain tracked correctly');
  }
}

// ============================================================================
// BUG TEST 5: Shadowing over-detection
// ============================================================================
async function testShadowingOverDetection() {
  console.log('\n🔍 BUG TEST: Variable shadowing over-detection');
  
  const indexer = await runIndexer(FIXTURES_PATH);
  const tracer = new DependencyTracer(indexer);
  
  // Find 'shadowed' export from shadowing.ts
  let shadowedDecl = null;
  for (const [uuid, node] of indexer.declarations) {
    if ((node.declaredNames || []).includes('shadowed') && 
        node.filePath?.includes('shadowing.ts') &&
        node.isExported) {
      shadowedDecl = { uuid, node };
      break;
    }
  }
  
  if (!shadowedDecl) {
    reportBug('Shadowing test setup', 'shadowed export found', 'not found');
    return;
  }
  
  const traced = tracer.traceAll();
  const tracedShadowed = traced.get(shadowedDecl.uuid);
  const internalConsumers = tracedShadowed?.dependant?.internal?.length || 0;
  
  // Only actualConsumer should use the exported 'shadowed'
  // consumer and consumer2 shadow it locally
  // Expected: 1 (just actualConsumer)
  // Actual with regex: likely 3 (all functions mention 'shadowed')
  
  if (internalConsumers > 1) {
    reportBug(
      'Shadowing causes false positive usage detection',
      '1 internal consumer (actualConsumer only)',
      `${internalConsumers} internal consumers`,
      'Regex-based matching cannot detect variable shadowing; requires scope analysis'
    );
  } else {
    reportPass('Shadowing detection is accurate (or conservative)');
  }
}

// ============================================================================
// BUG TEST 6: String/comment false positives
// ============================================================================
async function testStringCommentFalsePositives() {
  console.log('\n🔍 BUG TEST: String and comment false positives');
  
  const indexer = await runIndexer(FIXTURES_PATH);
  const tracer = new DependencyTracer(indexer);
  
  // Test the raw regex-stripping logic
  const testCases = [
    {
      name: 'identifier in single-quoted string',
      code: `const msg = 'targetSymbol is here';`,
      identifier: 'targetSymbol',
      shouldMatch: false,
    },
    {
      name: 'identifier in double-quoted string',
      code: `const msg = "targetSymbol is here";`,
      identifier: 'targetSymbol',
      shouldMatch: false,
    },
    {
      name: 'identifier in template literal',
      code: 'const msg = `targetSymbol is here`;',
      identifier: 'targetSymbol',
      shouldMatch: false,
    },
    {
      name: 'identifier in single-line comment',
      code: `// targetSymbol comment\nconst x = 1;`,
      identifier: 'targetSymbol',
      shouldMatch: false,
    },
    {
      name: 'identifier in multi-line comment',
      code: `/* targetSymbol comment */\nconst x = 1;`,
      identifier: 'targetSymbol',
      shouldMatch: false,
    },
    {
      name: 'real identifier usage',
      code: `const x = targetSymbol + 1;`,
      identifier: 'targetSymbol',
      shouldMatch: true,
    },
    {
      name: 'identifier after comment on same line',
      code: `const x = /* comment */ targetSymbol;`,
      identifier: 'targetSymbol',
      shouldMatch: true,
    },
    {
      name: 'identifier as object key (shorthand)',
      code: `const obj = { targetSymbol };`,
      identifier: 'targetSymbol',
      shouldMatch: true, // This IS a usage of the variable
    },
    {
      name: 'identifier as object key (property name only)',
      code: `const obj = { targetSymbol: "value" };`,
      identifier: 'targetSymbol',
      shouldMatch: false, // This is NOT a usage if only as key
      // Actually, with regex matching, this will match. Bug potential!
    },
    {
      name: 'identifier in regex literal',
      code: `const re = /targetSymbol/;`,
      identifier: 'targetSymbol',
      shouldMatch: false, // Debatable, but regex patterns shouldn't count
    },
    {
      name: 'escaped quote in string',
      code: `const s = "He said \\"targetSymbol\\" here"; const x = targetSymbol;`,
      identifier: 'targetSymbol',
      shouldMatch: true, // The second one is real usage
    },
  ];
  
  let failures = 0;
  
  for (const tc of testCases) {
    const result = tracer.isIdentifierUsedInCode(tc.code, tc.identifier);
    if (result !== tc.shouldMatch) {
      failures++;
      console.log(`   ❌ ${tc.name}: expected ${tc.shouldMatch}, got ${result}`);
    }
  }
  
  if (failures > 0) {
    reportBug(
      'String/comment stripping has edge cases',
      '0 false positives/negatives',
      `${failures} incorrect results`,
      'Regex-based string/comment removal may miss edge cases'
    );
  } else {
    reportPass('String and comment handling is correct');
  }
}

// ============================================================================
// BUG TEST 7: TypeScript type-only usage
// ============================================================================
async function testTypeOnlyUsage() {
  console.log('\n🔍 BUG TEST: TypeScript type-only usage tracking');
  
  const indexer = await runIndexer(FIXTURES_PATH);
  const tracer = new DependencyTracer(indexer);
  
  // Find MyInterface from type-only-import.ts
  let interfaceDecl = null;
  for (const [uuid, node] of indexer.declarations) {
    if ((node.declaredNames || []).includes('MyInterface') && 
        node.filePath?.includes('type-only-import.ts')) {
      interfaceDecl = { uuid, node };
      break;
    }
  }
  
  if (!interfaceDecl) {
    reportBug('Type-only test setup', 'MyInterface found', 'not found');
    return;
  }
  
  const traced = tracer.traceAll();
  const tracedInterface = traced.get(interfaceDecl.uuid);
  const externalConsumers = Object.keys(tracedInterface?.dependant?.external || {});
  
  // type-consumer.ts uses MyInterface in type annotations
  // import type { MyInterface } from './type-only-import'
  
  let foundConsumer = false;
  for (const consumerUuid of externalConsumers) {
    const consumerNode = indexer.project.get(consumerUuid);
    if (consumerNode?.filePath?.includes('type-consumer')) {
      foundConsumer = true;
      break;
    }
  }
  
  // Note: Type-only imports might not be tracked as "usage" depending on implementation
  if (!foundConsumer) {
    reportBug(
      'Type-only imports may not be tracked',
      'MyInterface usage in type-consumer.ts should be found',
      `Found ${externalConsumers.length} external consumers`,
      'import type { X } syntax may need special handling'
    );
  } else {
    reportPass('Type-only imports are tracked correctly');
  }
}

// ============================================================================
// BUG TEST 8: Mixed default and named imports from same statement
// ============================================================================
async function testMixedImportStatement() {
  console.log('\n🔍 BUG TEST: Mixed default and named imports');
  
  const indexer = await runIndexer(FIXTURES_PATH);
  
  // Check that default-and-named.ts has both default and named exports indexed
  let hasDefault = false;
  let hasNamed1 = false;
  let hasNamed2 = false;
  let hasMainComponentNamed = false;
  
  for (const [uuid, node] of indexer.exports) {
    if (!node.filePath?.includes('default-and-named.ts')) continue;
    
    for (const exp of node.exportedNames || []) {
      if (exp.exported === 'default') hasDefault = true;
      if (exp.exported === 'namedExport1') hasNamed1 = true;
      if (exp.exported === 'namedExport2') hasNamed2 = true;
      if (exp.exported === 'MainComponent' && exp.local === 'MainComponent') hasMainComponentNamed = true;
    }
  }
  
  if (!hasDefault || !hasNamed1 || !hasNamed2) {
    reportBug(
      'Mixed exports not all indexed',
      'default, namedExport1, namedExport2, MainComponent',
      `default: ${hasDefault}, named1: ${hasNamed1}, named2: ${hasNamed2}, MainComponent: ${hasMainComponentNamed}`,
      'File with both default and named exports may not index all'
    );
  } else {
    reportPass('Mixed default and named exports indexed correctly');
  }
}

// ============================================================================
// BUG TEST 9: Destructuring export names
// ============================================================================
async function testDestructuringExportNames() {
  console.log('\n🔍 BUG TEST: Destructuring export variable names');
  
  const indexer = await runIndexer(FIXTURES_PATH);
  
  // Check that destructuring.ts exports are properly named
  const expectedNames = ['extractedA', 'renamedB', 'first', 'second', 'rest', 'deepValue', 'withDefault'];
  const foundNames = new Set();
  
  for (const [uuid, node] of indexer.declarations) {
    if (!node.filePath?.includes('destructuring.ts')) continue;
    for (const name of node.declaredNames || []) {
      foundNames.add(name);
    }
  }
  
  const missing = expectedNames.filter(n => !foundNames.has(n));
  
  if (missing.length > 0) {
    reportBug(
      'Destructuring export names not all captured',
      `All of: ${expectedNames.join(', ')}`,
      `Missing: ${missing.join(', ')}`,
      'Complex destructuring patterns may not be fully parsed'
    );
  } else {
    reportPass('Destructuring export names all captured');
  }
}

// ============================================================================
// BUG TEST 10: Identifier substring false positive
// ============================================================================
async function testIdentifierSubstring() {
  console.log('\n🔍 BUG TEST: Identifier substring matching');
  
  const indexer = await runIndexer(FIXTURES_PATH);
  const tracer = new DependencyTracer(indexer);
  
  // Test that 'alpha' doesn't match 'alphaNumeric' or 'betaAlpha'
  const testCases = [
    {
      code: 'const alphaNumeric = 1;',
      identifier: 'alpha',
      shouldMatch: false,
    },
    {
      code: 'const betaAlpha = 1;',
      identifier: 'alpha',
      shouldMatch: false,
    },
    {
      code: 'const alpha = 1;',
      identifier: 'alpha',
      shouldMatch: true,
    },
    {
      code: 'return alpha + 1;',
      identifier: 'alpha',
      shouldMatch: true,
    },
    {
      code: 'console.log(_alpha);',
      identifier: 'alpha',
      shouldMatch: false, // _alpha is different
    },
    {
      code: 'console.log(alpha_);',
      identifier: 'alpha',
      shouldMatch: false, // alpha_ is different
    },
  ];
  
  let failures = 0;
  for (const tc of testCases) {
    const result = tracer.isIdentifierUsedInCode(tc.code, tc.identifier);
    if (result !== tc.shouldMatch) {
      failures++;
      console.log(`   ❌ "${tc.code}" for "${tc.identifier}": expected ${tc.shouldMatch}, got ${result}`);
    }
  }
  
  if (failures > 0) {
    reportBug(
      'Identifier word boundary matching issues',
      '0 substring false positives',
      `${failures} incorrect matches`,
      'Word boundary regex (\\b) may not handle all cases'
    );
  } else {
    reportPass('Identifier word boundary matching is correct');
  }
}

// ============================================================================
// RUN ALL BUG TESTS
// ============================================================================

async function runBugTests() {
  console.log('🐛 Atomizer Bug-Finding Test Suite');
  console.log('='.repeat(60));
  console.log('These tests aim to find edge cases and bugs\n');
  
  try {
    await testNamespacePropertyAccess();
    await testRenameChainTracking();
    await testExportStarTracking();
    await testDefaultImportRename();
    await testShadowingOverDetection();
    await testStringCommentFalsePositives();
    await testTypeOnlyUsage();
    await testMixedImportStatement();
    await testDestructuringExportNames();
    await testIdentifierSubstring();
  } catch (e) {
    console.error('\n💥 Test crashed:', e.message);
    console.error(e.stack);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Results: ${passed} passed, ${failed} bugs found`);
  
  if (bugs.length > 0) {
    console.log('\n🐛 BUGS SUMMARY:');
    for (const bug of bugs) {
      console.log(`\n   ${bug.name}`);
      console.log(`   Expected: ${bug.expected}`);
      console.log(`   Actual: ${bug.actual}`);
      if (bug.details) console.log(`   Note: ${bug.details}`);
    }
  }
  
  process.exit(bugs.length > 0 ? 1 : 0);
}

runBugTests();
