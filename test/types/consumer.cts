// A user's CommonJS module, type-checked against the packed tarball by check-dist.
import VanillaTree = require('vanillatree');

const options: VanillaTree.VanillaTreeOptions = { placeholder: 'Empty', theme: 'dark' };
const tree: VanillaTree = new VanillaTree(document.body, options);
const leaf: VanillaTree.LeafOptions = { label: 'A' };
const item: VanillaTree.ContextMenuItem = { label: 'x', action(id) { console.log(id.toUpperCase(), this.label); } };
tree.add(leaf).remove('vtree-1');
console.log(item);

// @ts-expect-error: not a module with a default export
VanillaTree.default;
