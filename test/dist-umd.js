// npm run test:dist: the suite against dist/vanillatree.min.js, run as a page runs a script tag
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(import.meta.dirname, '../dist/vanillatree.min.js'), 'utf8');
// biome-ignore lint/security/noGlobalEval: the bundle runs as a script, in the page's global scope
window.eval(source);
const { VanillaTree } = window;

export default VanillaTree;
export { VanillaTree };
