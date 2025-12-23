// Various ways to import from same module
import MainComponent, { namedExport1, namedExport2, MainComponent as MC } from './default-and-named';

// Uses both default and named
console.log(MainComponent());
console.log(MC());
console.log(namedExport1, namedExport2);
