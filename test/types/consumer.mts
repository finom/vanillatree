// A user's ES module, type-checked against the packed tarball by check-dist.
import VanillaTree, { type LeafOptions, type VanillaTreeEventDetail, VanillaTree as Named } from 'vanillatree';

const tree: Named = new VanillaTree('#tree', {
  placeholder: 'Empty',
  theme: 'auto',
  contextmenu: [{ label: 'Open', action: (id: string) => console.log(id) }]
});
const leaf: LeafOptions = { label: 'A', id: 1, selectable: false, html: true };
tree.add(leaf).add({ label: 'B', parent: 1 }).move('B', null).select('B');
const path: string[] = tree.getPath('B');
const parent: string | null = tree.getParent('B');
const element: HTMLElement = tree.getLeaf('B');
const maybe: HTMLElement | undefined = tree.getLeaf('C', true);
const children: boolean = tree.hasChildren(1);
tree.tree.addEventListener('vtree-select', (evt) => {
  const { id }: VanillaTreeEventDetail = (evt as CustomEvent<VanillaTreeEventDetail>).detail;
  console.log(id, path, parent, element, maybe, children);
});
tree.destroy();

// @ts-expect-error: label is required
tree.add({ id: 'x' });
// @ts-expect-error: no such theme
new VanillaTree('#tree', { theme: 'blue' });
