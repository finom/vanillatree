// Random sequences of calls against a plain model of the tree: after each call, the DOM, the ARIA state, the
// selection, the one tabbable leaf and the placeholder match the model.
import fc from 'fast-check';
import VanillaTree from 'vanillatree';

const IDS = ['a', 'b', 'c', 'd', 'e', '__proto__', 'constructor', '0'];
const id = fc.constantFrom(...IDS);
const parent = fc.option(id, { nil: null, freq: 3 });

// adds weigh more, so a run builds a tree deep enough for moves and removes to matter
const op = fc.oneof(
  {
    weight: 4,
    arbitrary: fc.record({
      kind: fc.constant('add' as const),
      id,
      parent,
      opened: fc.boolean(),
      selected: fc.boolean(),
      selectable: fc.boolean()
    })
  },
  { weight: 2, arbitrary: fc.record({ kind: fc.constant('move' as const), id, parent }) },
  {
    weight: 2,
    arbitrary: fc.record({
      kind: fc.constantFrom('remove' as const, 'open' as const, 'close' as const, 'toggle' as const),
      id
    })
  },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant('select' as const), id }) }
);

interface Model {
  parent: Map<string, string | null>;
  children: Map<string | null, string[]>;
  opened: Set<string>;
  selectable: Set<string>;
  selected: string | null;
}

const descendants = (model: Model, root: string): string[] => {
  const all = [root];
  for (const child of model.children.get(root) ?? []) all.push(...descendants(model, child));
  return all;
};

const visible = (model: Model, leaf: string) => {
  for (let current = model.parent.get(leaf) ?? null; current !== null; current = model.parent.get(current) ?? null) {
    if (!model.opened.has(current)) return false;
  }
  return true;
};

const check = (tree: VanillaTree, model: Model) => {
  const leaves = Array.from(tree.tree.querySelectorAll('li.vtree-leaf')) as HTMLElement[];
  expect(leaves.map((leaf) => leaf.getAttribute('data-vtree-id')).sort()).toEqual([...model.parent.keys()].sort());
  expect(Object.keys(tree.leafs).sort()).toEqual([...model.parent.keys()].sort());

  const walk = (key: string | null): string[] => {
    const list = key === null ? tree.tree : tree.getChildList(key);
    return Array.from(list.children)
      .filter((leaf) => leaf.classList.contains('vtree-leaf'))
      .map((leaf) => leaf.getAttribute('data-vtree-id') as string);
  };
  for (const key of [null, ...model.parent.keys()]) {
    expect(walk(key)).toEqual(model.children.get(key) ?? []);
  }

  for (const [key] of model.parent) {
    const leaf = tree.getLeaf(key);
    const hasChildren = (model.children.get(key) ?? []).length > 0;
    expect(tree.hasChildren(key)).toBe(hasChildren);
    expect(leaf.classList.contains('vtree-has-children')).toBe(hasChildren);
    expect(leaf.getAttribute('aria-expanded')).toBe(hasChildren ? String(model.opened.has(key)) : null);
    expect(leaf.classList.contains('closed')).toBe(!model.opened.has(key));
    const selected = model.selected === key;
    expect(leaf.classList.contains('vtree-selected')).toBe(selected);
    expect(leaf.getAttribute('aria-selected')).toBe(model.selectable.has(key) ? String(selected) : null);
    expect(tree.getParent(key)).toBe(model.parent.get(key));
  }

  expect(tree.getSelected()).toBe(model.selected);
  const tabbable = leaves.filter((leaf) => leaf.getAttribute('tabindex') === '0');
  expect(tabbable.length).toBe(model.parent.size ? 1 : 0);
  if (tabbable.length) expect(visible(model, tabbable[0].getAttribute('data-vtree-id') as string)).toBe(true);
  expect(tree.tree.querySelectorAll('.vtree-placeholder').length).toBe(model.parent.size ? 0 : 1);
};

it('keeps the DOM, ARIA, selection and focus order equal to a model', () => {
  fc.assert(
    fc.property(fc.array(op, { minLength: 10, maxLength: 60 }), (ops) => {
      document.body.innerHTML = '<div id="root"></div>';
      const tree = new VanillaTree('#root', { placeholder: 'empty' });
      const model: Model = {
        parent: new Map(),
        children: new Map(),
        opened: new Set(),
        selectable: new Set(),
        selected: null
      };
      const listOf = (key: string | null) => {
        if (!model.children.has(key)) model.children.set(key, []);
        return model.children.get(key) as string[];
      };

      for (const step of ops) {
        const known = model.parent.has(step.id);
        if (step.kind === 'add') {
          const parentKnown = step.parent === null || model.parent.has(step.parent);
          const call = () =>
            tree.add({
              label: step.id,
              id: step.id,
              parent: step.parent ?? undefined,
              opened: step.opened,
              selected: step.selected,
              selectable: step.selectable
            });
          if (!parentKnown || known) {
            expect(call).toThrow();
            continue;
          }
          call();
          model.parent.set(step.id, step.parent);
          listOf(step.parent).push(step.id);
          if (step.opened) model.opened.add(step.id);
          if (step.selectable) {
            model.selectable.add(step.id);
            if (step.selected) model.selected = step.id;
          }
        } else if (step.kind === 'move') {
          const into = step.parent;
          if (!known || (into !== null && !model.parent.has(into))) {
            expect(() => tree.move(step.id, into)).toThrow();
            continue;
          }
          if (into !== null && descendants(model, step.id).includes(into)) {
            expect(() => tree.move(step.id, into)).toThrow("can't move");
            continue;
          }
          tree.move(step.id, into);
          const from = listOf(model.parent.get(step.id) ?? null);
          from.splice(from.indexOf(step.id), 1);
          listOf(into).push(step.id);
          model.parent.set(step.id, into);
        } else if (!known) {
          expect(() => tree[step.kind](step.id)).toThrow('No VanillaTree leaf');
          continue;
        } else if (step.kind === 'remove') {
          tree.remove(step.id);
          const from = listOf(model.parent.get(step.id) ?? null);
          from.splice(from.indexOf(step.id), 1);
          for (const gone of descendants(model, step.id)) {
            model.parent.delete(gone);
            model.children.delete(gone);
            model.opened.delete(gone);
            model.selectable.delete(gone);
            if (model.selected === gone) model.selected = null;
          }
        } else if (step.kind === 'select') {
          tree.select(step.id);
          if (model.selectable.has(step.id)) model.selected = step.id;
        } else {
          tree[step.kind](step.id);
          const open = step.kind === 'open' || (step.kind === 'toggle' && !model.opened.has(step.id));
          if (open) model.opened.add(step.id);
          else model.opened.delete(step.id);
        }
        check(tree, model);
      }
      tree.destroy();
    }),
    { numRuns: 300 }
  );
});
