#!/usr/bin/env node
/**
 * Standalone script to detect re-exports in a codebase
 * Usage: node dist/detectReexports.js <srcPath>
 */

import { ReexportInliner } from './core/ReexportInliner';

const srcPath = process.argv[2];

if (!srcPath) {
  console.error('Usage: node detectReexports.js <srcPath>');
  process.exit(1);
}

async function main() {
  console.log(`Detecting re-exports in: ${srcPath}\n`);

  const inliner = new ReexportInliner(srcPath);
  const reexports = await inliner.detectReexports();

  if (reexports.length === 0) {
    console.log('No re-exports found!');
    return;
  }

  console.log(`Found ${reexports.length} files with re-exports:\n`);

  for (const file of reexports) {
    console.log(`📄 ${file.relativePath}`);
    console.log(`   Total re-exports: ${file.reexportCount}`);
    console.log(`   Source files: ${file.sourceFiles.join(', ')}`);

    for (const exp of file.exports) {
      const typeLabel = exp.isTypeOnly ? '[TYPE]' : '';
      console.log(`     ${typeLabel} ${exp.names.join(', ')} from '${exp.source}'`);
    }
    console.log();
  }

  const totalReexports = reexports.reduce((sum, f) => sum + f.reexportCount, 0);
  console.log(`\n✨ Total re-exported names: ${totalReexports}`);
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
