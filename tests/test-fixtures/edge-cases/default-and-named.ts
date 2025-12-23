// Test: File with both default and named exports

export const namedExport1 = "named1";
export const namedExport2 = "named2";

function MainComponent() {
  return "main";
}

export default MainComponent;

// Re-export default as named
export { MainComponent };
