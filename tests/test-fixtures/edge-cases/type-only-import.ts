// Test: Type-only imports in TypeScript
// Bug potential: Type imports might not be tracked, or might be incorrectly treated as value imports

export interface MyInterface {
  name: string;
  value: number;
}

export type MyType = {
  id: string;
};

export class MyClass {
  constructor(public data: MyInterface) {}
}

// Type that is also used as value
export const TypeAndValue = {
  create: () => ({ id: "1" })
};
