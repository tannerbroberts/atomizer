// Consumes via namespace import
import * as NS from './namespace-import';

// These usages should all be tracked back to namespace-import.ts
const a = NS.alpha;
const b = NS.beta;
const c = NS.gamma();

// What about destructuring from namespace?
const { alpha: localAlpha } = NS;
console.log(localAlpha);
