// Various ways to import types
import type { MyInterface, MyType } from './type-only-import';
import { MyClass, TypeAndValue } from './type-only-import';

// Type annotation usage (type-only)
const data: MyInterface = { name: "test", value: 1 };
const myType: MyType = { id: "1" };

// Value usage
const instance = new MyClass(data);
const created = TypeAndValue.create();

// Type usage in generic
function process<T extends MyInterface>(input: T): T {
  return input;
}

// Type usage in type assertion
const asserted = {} as MyInterface;
