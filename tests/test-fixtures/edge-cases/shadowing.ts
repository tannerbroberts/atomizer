// Test: Variable shadowing - local declarations should NOT be tracked as using the export

export const shadowed = "I am the export";

function consumer() {
  // This shadows the export - usage below should NOT trace to the export
  const shadowed = "I am local";
  console.log(shadowed);  // This uses LOCAL shadowed, not export
}

function consumer2() {
  // Parameter shadowing
  return function inner(shadowed: string) {
    console.log(shadowed);  // Uses parameter, not export
  };
}

function actualConsumer() {
  // This DOES use the export
  console.log(shadowed);
}
