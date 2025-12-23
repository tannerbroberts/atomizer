// Uses dynamic import
async function loadDynamic() {
  const module = await import('./dynamic-import');
  console.log(module.dynamicTarget);
  console.log(module.default());
}

// Destructured dynamic import
async function loadDestructured() {
  const { dynamicTarget } = await import('./dynamic-import');
  console.log(dynamicTarget);
}
