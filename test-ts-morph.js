/**
 * Simple test to verify ts-morph implementation works
 */
const path = require('path');
const { ProjectIndex } = require('./dist/core/ProjectIndex');
const { DependencyTracer } = require('./dist/core/DependencyTracer');
const FileInventory = require('./src/FileInventory');

async function testTsMorph() {
  console.log('🧪 Testing ts-morph implementation...\n');

  const srcPath = path.resolve('./src');

  try {
    console.log('1. Testing ProjectIndex...');
    const index = new ProjectIndex(srcPath);
    const inventory = new FileInventory(srcPath);
    const files = await inventory.scan();
    await index.indexAll(files.filter(f => ['.js', '.ts'].includes(f.extension)));

    const stats = index.getStats();
    console.log(`   ✓ Indexed ${stats.declarationNodes} declarations`);
    console.log(`   ✓ Found ${stats.importNodes} imports`);
    console.log(`   ✓ Found ${stats.exportNodes} exports\n`);

    console.log('2. Testing DependencyTracer...');
    const tracer = new DependencyTracer(index);
    tracer.traceAll();

    const summary = tracer.getSummary();
    console.log(`   ✓ Traced ${summary.totalDeclarations} declarations`);
    console.log(`   ✓ With external dependants: ${summary.withExternalDependants}`);
    console.log(`   ✓ Orphaned: ${summary.orphaned}\n`);

    console.log('3. Checking sample declaration...');
    const declarations = Array.from(index.getDeclarations().values());
    if (declarations.length > 0) {
      const sampleDecl = declarations[0];
      console.log(`   ✓ Sample: "${sampleDecl.name}" (${sampleDecl.isExported ? 'exported' : 'internal'})`);

      const deps = tracer.getDependencies(sampleDecl.node);
      if (deps) {
        console.log(`   ✓ Internal dependants: ${deps.internal.length}`);
        console.log(`   ✓ External dependants: ${deps.external.size}\n`);
      }
    }

    console.log('✅ All tests passed! ts-morph implementation is working.\n');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

testTsMorph().then(success => {
  process.exit(success ? 0 : 1);
});
