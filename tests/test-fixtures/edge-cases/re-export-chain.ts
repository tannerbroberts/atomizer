// Test: Re-export chains should be fully traced
// original.ts -> reexport1.ts -> reexport2.ts -> consumer.ts

export const deeplyNested = "I am deeply nested";
export default function DeepFunction() {
  return "deep";
}
