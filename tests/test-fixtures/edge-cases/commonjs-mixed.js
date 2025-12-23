// Test: CommonJS mixed with ES modules patterns

const helper = require('./namespace-import');

// Various CommonJS patterns
const { alpha } = require('./namespace-import');
const beta = require('./namespace-import').beta;

// Usage
console.log(helper.gamma());
console.log(alpha);
console.log(beta);

// module.exports patterns
function MyClass() {}
MyClass.prototype.method = function() {};

module.exports = MyClass;
