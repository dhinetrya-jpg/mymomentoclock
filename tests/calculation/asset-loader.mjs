// Node SSR tests need URL exports for Vite's static image imports.
// This hook changes no calculation modules or application assertions.
export async function load(url, context, nextLoad) {
  if (url.startsWith('file:') && url.includes('/src/assets/images/') && url.endsWith('.jpg')) {
    return { format: 'module', source: `export default ${JSON.stringify(url)};`, shortCircuit: true };
  }
  return nextLoad(url, context);
}
