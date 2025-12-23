// Consumes CommonJS export
const MyClass = require('./commonjs-mixed');

const instance = new MyClass();
instance.method();

// Named exports from CommonJS
const { someExport } = require('./commonjs-named');
