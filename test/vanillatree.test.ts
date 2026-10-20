import VanillaTree, { VanillaTree as Named } from 'vanillatree';

let root: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div><button id="outside"></button>';
  root = document.getElementById('root') as HTMLElement;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const leafIds = (tree: VanillaTree) =>
  Array.from(tree.tree.querySelectorAll('li.vtree-leaf')).map((leaf) => leaf.getAttribute('data-vtree-id'));
const label = (tree: VanillaTree, id: string) => tree.getLeaf(id).querySelector('.vtree-leaf-label') as HTMLElement;
const toggleOf = (tree: VanillaTree, id: string) => tree.getLeaf(id).querySelector('.vtree-toggle') as HTMLElement;
const press = (target: Element, key: string, init?: KeyboardEventInit) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
const click = (target: Element, button = 0) =>
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button }));
const rightClick = (target: Element) =>
  target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 }));
const tabbable = (tree: VanillaTree) =>
  Array.from(tree.tree.querySelectorAll('li.vtree-leaf[tabindex="0"]')).map((leaf) =>
    leaf.getAttribute('data-vtree-id')
  );
const events = (target: EventTarget, names: string[]) => {
  const log: string[] = [];
  for (const name of names) {
    target.addEventListener(`vtree-${name}`, (evt) => {
      log.push(`${name}:${(evt as CustomEvent).detail.id}`);
    });
  }
  return log;
};

// a, a > a1, a > a1 > a1x, a > a2, b
const sample = (options?: ConstructorParameters<typeof VanillaTree>[1]) =>
  new VanillaTree(root, options)
    .add({ label: 'A', id: 'a', opened: true })
    .add({ label: 'A1', id: 'a1', parent: 'a' })
    .add({ label: 'A1x', id: 'a1x', parent: 'a1' })
    .add({ label: 'A2', id: 'a2', parent: 'a' })
    .add({ label: 'B', id: 'b' });

describe('exports', () => {
  it('has the class as the default and a named export', () => {
    expect(Named).toBe(VanillaTree);
    expect(typeof VanillaTree).toBe('function');
  });
});

describe('constructor', () => {
  it('takes a selector, an element or an array-like', () => {
    expect(new VanillaTree('#root').container).toBe(root);
    expect(new VanillaTree(root).container).toBe(root);
    expect(new VanillaTree(document.querySelectorAll('#root')).container).toBe(root);
    expect(new VanillaTree([root]).container).toBe(root);
    expect(root.querySelectorAll('ul.vtree').length).toBe(4);
  });

  it('throws without an element', () => {
    expect(() => new VanillaTree('#missing')).toThrow('VanillaTree: no element for #missing');
    expect(() => new VanillaTree(null as unknown as string)).toThrow('no element');
    expect(() => new VanillaTree([])).toThrow('no element');
  });

  it('renders a tree with the tree role', () => {
    const { tree } = new VanillaTree(root);
    expect(tree.tagName).toBe('UL');
    expect(tree.className).toBe('vtree');
    expect(tree.getAttribute('role')).toBe('tree');
    expect(tree.parentNode).toBe(root);
  });
});

describe('placeholder', () => {
  it('shows as text while the tree is empty', () => {
    const tree = new VanillaTree(root, { placeholder: '<b>Nothing</b>' });
    const placeholder = () => tree.tree.querySelector('.vtree-placeholder');
    expect(placeholder()?.textContent).toBe('<b>Nothing</b>');
    expect(placeholder()?.getAttribute('role')).toBe('none');
    tree.add({ label: 'A', id: 'a' });
    expect(placeholder()).toBe(null);
    tree.add({ label: 'B', id: 'b' });
    tree.remove('a');
    expect(placeholder()).toBe(null);
    tree.remove('b');
    expect(placeholder()?.textContent).toBe('<b>Nothing</b>');
  });

  it('is not there without the option', () => {
    const tree = new VanillaTree(root).add({ label: 'A', id: 'a' }).remove('a');
    expect(tree.tree.children.length).toBe(0);
  });
});

describe('add', () => {
  it('writes the label as text by default and as HTML with html: true (#6)', () => {
    const tree = new VanillaTree(root)
      .add({ label: '<img src=x onerror=alert(1)>', id: 'text' })
      .add({ label: '<b>bold</b> label', id: 'html', html: true });
    expect(label(tree, 'text').textContent).toBe('<img src=x onerror=alert(1)>');
    expect(label(tree, 'text').children.length).toBe(0);
    expect(label(tree, 'html').innerHTML).toBe('<b>bold</b> label');
  });

  it('throws for an id that is already there (#8)', () => {
    const tree = new VanillaTree(root).add({ label: 'A', id: 'a' });
    expect(() => tree.add({ label: 'A again', id: 'a' })).toThrow('VanillaTree leaf with id "a" already exists');
    expect(leafIds(tree)).toEqual(['a']);
  });

  it('generates an id that is free', () => {
    const tree = new VanillaTree(root)
      .add({ label: 'taken', id: 'vtree-2' })
      .add({ label: 'A' })
      .add({ label: 'B', id: '' });
    expect(leafIds(tree)).toEqual(['vtree-2', 'vtree-3', 'vtree-5']);
  });

  it('keeps a number id as a string', () => {
    const tree = new VanillaTree(root).add({ label: 'zero', id: 0 }).add({ label: 'child', id: 1, parent: 0 });
    expect(leafIds(tree)).toEqual(['0', '1']);
    expect(tree.getParent(1)).toBe('0');
    expect(tree.leafs['1'].label).toBe('child');
  });

  it('takes ids that are names on Object.prototype', () => {
    const tree = new VanillaTree(root)
      .add({ label: 'proto', id: '__proto__' })
      .add({ label: 'ctor', id: 'constructor', parent: '__proto__' });
    expect(tree.getParent('constructor')).toBe('__proto__');
    expect(() => tree.getLeaf('toString')).toThrow('No VanillaTree leaf with id "toString"');
    expect(({} as Record<string, unknown>).label).toBe(undefined);
  });

  it('takes ids with quotes and brackets', () => {
    const tree = new VanillaTree(root).add({ label: 'q', id: 'a"b' }).add({ label: 'r', id: 'x]y', parent: 'a"b' });
    expect(tree.getPath('x]y')).toEqual(['a"b', 'x]y']);
    tree.select('x]y').remove('a"b');
    expect(leafIds(tree)).toEqual([]);
  });

  it('throws for an unknown parent', () => {
    expect(() => new VanillaTree(root).add({ label: 'A', parent: 'nope' })).toThrow(
      'No VanillaTree leaf with id "nope"'
    );
  });

  it('renders a tree item with its ARIA attributes', () => {
    const tree = new VanillaTree(root).add({ label: 'A', id: 'a' }).add({ label: 'A1', id: 'a1', parent: 'a' });
    const leaf = tree.getLeaf('a');
    expect(leaf.getAttribute('role')).toBe('treeitem');
    expect(leaf.getAttribute('aria-selected')).toBe('false');
    expect(leaf.getAttribute('aria-expanded')).toBe('false');
    expect(tree.getLeaf('a1').hasAttribute('aria-expanded')).toBe(false);
    const labelId = leaf.getAttribute('aria-labelledby') as string;
    expect(document.getElementById(labelId)).toBe(label(tree, 'a'));
    expect(toggleOf(tree, 'a').getAttribute('aria-hidden')).toBe('true');
    expect(tree.getChildList('a').getAttribute('role')).toBe('group');
    expect(leaf.classList.contains('vtree-has-children')).toBe(true);
    expect(leaf.classList.contains('closed')).toBe(true);
  });

  it('gives each label a page-wide unique id', () => {
    const one = new VanillaTree(root).add({ label: 'A', id: 'a' });
    const two = new VanillaTree(root).add({ label: 'A', id: 'a' });
    expect(label(one, 'a').id).not.toBe(label(two, 'a').id);
  });

  it('opens and selects as asked', () => {
    const tree = new VanillaTree(root).add({ label: 'A', id: 'a', opened: true, selected: true });
    expect(tree.getLeaf('a').classList.contains('closed')).toBe(false);
    expect(tree.getLeaf('a').classList.contains('vtree-selected')).toBe(true);
  });

  it('fires add on the leaf, select before it, and no close', () => {
    const tree = new VanillaTree(root);
    const log = events(root, ['add', 'select', 'close', 'open']);
    tree.add({ label: 'A', id: 'a', selected: true }).add({ label: 'B', id: 'b', parent: 'a' });
    expect(log).toEqual(['select:a', 'add:a', 'add:b']);
  });

  it('keeps the options it was given', () => {
    const options = { label: 'A', id: 'a', custom: 1 };
    const tree = new VanillaTree(root).add(options);
    expect(tree.leafs.a).toBe(options);
  });
});

describe('getLeaf, getChildList, getParent, getPath, hasChildren', () => {
  it('getLeaf throws for an unknown id unless told not to', () => {
    const tree = sample();
    expect(tree.getLeaf('a').tagName).toBe('LI');
    expect(() => tree.getLeaf('x')).toThrow('No VanillaTree leaf with id "x"');
    expect(tree.getLeaf('x', true)).toBe(undefined);
  });

  it('getChildList gives the root list or makes the leaf a child list', () => {
    const tree = sample();
    expect(tree.getChildList()).toBe(tree.tree);
    expect(tree.getChildList(null)).toBe(tree.tree);
    expect(tree.getLeaf('b').querySelector('ul')).toBe(null);
    const list = tree.getChildList('b');
    expect(list.className).toBe('vtree-subtree');
    expect(tree.getChildList('b')).toBe(list);
  });

  it('getParent and getPath walk up (#10)', () => {
    const tree = sample();
    expect(tree.getParent('a1x')).toBe('a1');
    expect(tree.getParent('a')).toBe(null);
    expect(tree.getPath('a1x')).toEqual(['a', 'a1', 'a1x']);
    expect(tree.getPath('b')).toEqual(['b']);
  });

  it('hasChildren tells a parent from a leaf without children (#11)', () => {
    const tree = sample();
    expect(tree.hasChildren('a')).toBe(true);
    expect(tree.hasChildren('a2')).toBe(false);
    tree.getChildList('a2');
    expect(tree.hasChildren('a2')).toBe(false);
  });
});

describe('move', () => {
  it('moves a leaf under another parent and to the root', () => {
    const tree = sample();
    const log = events(root, ['move']);
    tree.move('a1', 'b');
    expect(tree.getPath('a1x')).toEqual(['b', 'a1', 'a1x']);
    expect(tree.leafs.a1.parent).toBe('b');
    expect(tree.getLeaf('b').classList.contains('vtree-has-children')).toBe(true);
    expect(tree.getLeaf('b').getAttribute('aria-expanded')).toBe('false');
    tree.move('a2');
    expect(tree.getParent('a2')).toBe(null);
    expect(tree.leafs.a2.parent).toBe(undefined);
    expect(tree.getLeaf('a').classList.contains('vtree-has-children')).toBe(false);
    expect(tree.getLeaf('a').hasAttribute('aria-expanded')).toBe(false);
    tree.move('a2', 'a');
    expect(tree.getParent('a2')).toBe('a');
    expect(log).toEqual(['move:a1', 'move:a2', 'move:a2']);
  });

  it('leaves the container classes alone when a root leaf moves', () => {
    const tree = sample();
    root.className = 'mine';
    tree.move('b', 'a');
    expect(root.className).toBe('mine');
    tree.move('b');
    expect(root.className).toBe('mine');
  });

  it('refuses to move a leaf into itself or under its own child', () => {
    const tree = sample();
    expect(() => tree.move('a', 'a')).toThrow(`VanillaTree can't move leaf "a" into itself`);
    expect(() => tree.move('a', 'a1x')).toThrow(`can't move leaf "a" into itself`);
    expect(tree.getPath('a1x')).toEqual(['a', 'a1', 'a1x']);
  });
});

describe('remove', () => {
  it('removes the leaf with its children and forgets their ids', () => {
    const tree = sample();
    const log = events(root, ['remove']);
    tree.remove('a1');
    expect(leafIds(tree)).toEqual(['a', 'a2', 'b']);
    expect(Object.keys(tree.leafs)).toEqual(['a', 'a2', 'b']);
    expect(tree.getLeaf('a1x', true)).toBe(undefined);
    tree.add({ label: 'again', id: 'a1x' });
    expect(log).toEqual(['remove:a1']);
  });

  it('updates the parent when its last child goes', () => {
    const tree = sample().remove('a1x');
    expect(tree.getLeaf('a1').classList.contains('vtree-has-children')).toBe(false);
    tree.remove('b');
    expect(root.classList.length).toBe(0);
  });

  it('forgets the selection when the selected leaf goes', () => {
    const tree = sample().select('a1x');
    tree.remove('a1');
    expect(tree.getSelected()).toBe(null);
    const log = events(root, ['select']);
    tree.select('a2');
    expect(log).toEqual(['select:a2']);
  });
});

describe('open, close, toggle', () => {
  it('switches the closed class and aria-expanded, with events', () => {
    const tree = sample();
    const log = events(root, ['open', 'close']);
    tree.open('a1');
    expect(tree.getLeaf('a1').classList.contains('closed')).toBe(false);
    expect(tree.getLeaf('a1').getAttribute('aria-expanded')).toBe('true');
    tree.close('a1');
    expect(tree.getLeaf('a1').getAttribute('aria-expanded')).toBe('false');
    tree.toggle('a1').toggle('a1');
    expect(tree.getLeaf('a1').classList.contains('closed')).toBe(true);
    tree.open('b');
    expect(tree.getLeaf('b').hasAttribute('aria-expanded')).toBe(false);
    expect(log).toEqual(['open:a1', 'close:a1', 'open:a1', 'close:a1', 'open:b']);
  });
});

describe('select', () => {
  it('selects one leaf at a time', () => {
    const tree = sample();
    expect(tree.getSelected()).toBe(null);
    const log = events(root, ['select']);
    tree.select('a1').select('a1').select('b');
    expect(tree.getLeaf('a1').classList.contains('vtree-selected')).toBe(false);
    expect(tree.getLeaf('a1').getAttribute('aria-selected')).toBe('false');
    expect(tree.getLeaf('b').classList.contains('vtree-selected')).toBe(true);
    expect(tree.getLeaf('b').getAttribute('aria-selected')).toBe('true');
    expect(tree.getSelected()).toBe('b');
    expect(log).toEqual(['select:a1', 'select:b']);
  });

  it('does nothing for a leaf that is not selectable (#11)', () => {
    const tree = new VanillaTree(root).add({ label: 'folder', id: 'f', selectable: false });
    const log = events(root, ['select']);
    tree.select('f');
    expect(tree.getLeaf('f').classList.contains('vtree-selected')).toBe(false);
    expect(tree.getLeaf('f').hasAttribute('aria-selected')).toBe(false);
    expect(log).toEqual([]);
  });
});

describe('mouse', () => {
  it('selects on a label click, also on HTML inside the label (#7)', () => {
    const tree = new VanillaTree(root)
      .add({ label: 'plain', id: 'p' })
      .add({ label: '<b>bold</b> text', id: 'h', html: true });
    click(label(tree, 'p'));
    expect(tree.getSelected()).toBe('p');
    click(label(tree, 'h').querySelector('b') as Element);
    expect(tree.getSelected()).toBe('h');
  });

  it('toggles on a toggle click', () => {
    const tree = sample();
    click(toggleOf(tree, 'a'));
    expect(tree.getLeaf('a').classList.contains('closed')).toBe(true);
    click(toggleOf(tree, 'a'));
    expect(tree.getLeaf('a').classList.contains('closed')).toBe(false);
  });

  it('opens and closes a leaf that is not selectable on a label click (#11)', () => {
    const tree = new VanillaTree(root)
      .add({ label: 'folder', id: 'f', selectable: false })
      .add({ label: 'empty folder', id: 'e', selectable: false })
      .add({ label: 'file', id: 'x', parent: 'f' });
    click(label(tree, 'f'));
    expect(tree.getLeaf('f').classList.contains('closed')).toBe(false);
    click(label(tree, 'f'));
    expect(tree.getLeaf('f').classList.contains('closed')).toBe(true);
    const log = events(root, ['open', 'close', 'select']);
    click(label(tree, 'e'));
    expect(log).toEqual([]);
    expect(tree.getSelected()).toBe(null);
  });

  it('ignores clicks elsewhere in the tree', () => {
    const tree = sample({ placeholder: 'x' });
    const log = events(root, ['open', 'close', 'select']);
    click(tree.tree);
    click(tree.getLeaf('a'));
    click(tree.getChildList('a'));
    expect(log).toEqual([]);
  });
});

describe('keyboard', () => {
  it('has one tabbable leaf: the first, then the selected one', () => {
    const tree = new VanillaTree(root);
    expect(tabbable(tree)).toEqual([]);
    tree.add({ label: 'A', id: 'a' }).add({ label: 'B', id: 'b' });
    expect(tabbable(tree)).toEqual(['a']);
    tree.select('b');
    expect(tabbable(tree)).toEqual(['b']);
    tree.remove('b');
    expect(tabbable(tree)).toEqual(['a']);
    tree.remove('a');
    expect(tabbable(tree)).toEqual([]);
  });

  it('moves the tabbable leaf out of a closed parent and back to the selected one', () => {
    const tree = sample().open('a1').select('a1x');
    expect(tabbable(tree)).toEqual(['a1x']);
    tree.close('a');
    expect(tabbable(tree)).toEqual(['a']);
    tree.open('a');
    expect(tabbable(tree)).toEqual(['a']);
    tree.select('b');
    tree.move('b', 'a1');
    expect(tabbable(tree)).toEqual(['b']);
    tree.close('a1');
    expect(tabbable(tree)).toEqual(['a1']);
  });

  it('takes focus to the leaf a click focused', () => {
    const tree = sample();
    tree.getLeaf('a2').focus();
    expect(tabbable(tree)).toEqual(['a2']);
  });

  it('walks the visible leaves with the arrows, Home and End', () => {
    const tree = sample();
    tree.getLeaf('a').focus();
    const active = () => document.activeElement?.getAttribute('data-vtree-id');
    expect(press(tree.getLeaf('a'), 'ArrowDown')).toBe(false);
    expect(active()).toBe('a1');
    press(tree.getLeaf('a1'), 'ArrowDown');
    expect(active()).toBe('a2');
    press(tree.getLeaf('a2'), 'ArrowDown');
    expect(active()).toBe('b');
    press(tree.getLeaf('b'), 'ArrowDown');
    expect(active()).toBe('b');
    press(tree.getLeaf('b'), 'ArrowUp');
    expect(active()).toBe('a2');
    press(tree.getLeaf('a2'), 'Home');
    expect(active()).toBe('a');
    press(tree.getLeaf('a'), 'ArrowUp');
    expect(active()).toBe('a');
    press(tree.getLeaf('a'), 'End');
    expect(active()).toBe('b');
    expect(tabbable(tree)).toEqual(['b']);
  });

  it('opens, enters, closes and leaves with Right and Left', () => {
    const tree = sample();
    const active = () => document.activeElement?.getAttribute('data-vtree-id');
    tree.getLeaf('a1').focus();
    press(tree.getLeaf('a1'), 'ArrowRight');
    expect(tree.getLeaf('a1').classList.contains('closed')).toBe(false);
    expect(active()).toBe('a1');
    press(tree.getLeaf('a1'), 'ArrowRight');
    expect(active()).toBe('a1x');
    press(tree.getLeaf('a1x'), 'ArrowRight');
    expect(active()).toBe('a1x');
    press(tree.getLeaf('a1x'), 'ArrowLeft');
    expect(active()).toBe('a1');
    press(tree.getLeaf('a1'), 'ArrowLeft');
    expect(tree.getLeaf('a1').classList.contains('closed')).toBe(true);
    press(tree.getLeaf('a1'), 'ArrowLeft');
    expect(active()).toBe('a');
    press(tree.getLeaf('a'), 'ArrowLeft');
    press(tree.getLeaf('a'), 'ArrowLeft');
    expect(active()).toBe('a');
  });

  it('selects with Enter and Space, toggles a leaf that is not selectable', () => {
    const tree = new VanillaTree(root)
      .add({ label: 'folder', id: 'f', selectable: false })
      .add({ label: 'file', id: 'x', parent: 'f' })
      .add({ label: 'empty', id: 'e', selectable: false })
      .add({ label: 'other', id: 'o' });
    press(tree.getLeaf('o'), 'Enter');
    expect(tree.getSelected()).toBe('o');
    press(tree.getLeaf('f'), ' ');
    expect(tree.getLeaf('f').classList.contains('closed')).toBe(false);
    press(tree.getLeaf('x'), ' ');
    expect(tree.getSelected()).toBe('x');
    press(tree.getLeaf('f'), 'Enter');
    expect(tree.getLeaf('f').classList.contains('closed')).toBe(true);
    expect(press(tree.getLeaf('e'), 'Enter')).toBe(false);
  });

  it("reads IE's key names", () => {
    const tree = sample();
    const active = () => document.activeElement?.getAttribute('data-vtree-id');
    tree.getLeaf('a').focus();
    press(tree.getLeaf('a'), 'Down');
    expect(active()).toBe('a1');
    press(tree.getLeaf('a1'), 'Right');
    expect(tree.getLeaf('a1').classList.contains('closed')).toBe(false);
    press(tree.getLeaf('a1'), 'Left');
    expect(tree.getLeaf('a1').classList.contains('closed')).toBe(true);
    press(tree.getLeaf('a1'), 'Up');
    expect(active()).toBe('a');
    press(tree.getLeaf('a'), 'Spacebar');
    expect(tree.getSelected()).toBe('a');
  });

  it('lets other keys and other targets through', () => {
    const tree = sample();
    expect(press(tree.getLeaf('a'), 'x')).toBe(true);
    expect(press(tree.getLeaf('a'), 'constructor')).toBe(true);
    expect(press(tree.getLeaf('a'), 'F10')).toBe(true);
    expect(press(label(tree, 'a'), 'ArrowDown')).toBe(true);
    expect(press(tree.tree, 'ArrowDown')).toBe(true);
    expect(press(tree.getLeaf('a'), 'ContextMenu')).toBe(true);
  });

  it("ignores a leaf of a tree inside a label's HTML", () => {
    const outer = new VanillaTree(root).add({ label: '<span class="inner"></span>', id: 'o', html: true });
    const inner = new VanillaTree(root.querySelector('.inner') as Element)
      .add({ label: 'I', id: 'i' })
      .add({ label: 'J', id: 'j' });
    const log = events(root, ['select', 'open', 'close']);
    press(inner.getLeaf('i'), 'Enter');
    click(label(inner, 'j'));
    click(toggleOf(inner, 'j'));
    // the inner tree's own toggle, once
    expect(log).toEqual(['select:i', 'select:j', 'open:j']);
    expect(outer.getSelected()).toBe(null);
    inner.getLeaf('i').focus();
    expect(outer._tabbable).toBe('o');
  });

  it('moves focus to the parent that closes over it', () => {
    const tree = sample().open('a1');
    tree.getLeaf('a1x').focus();
    tree.close('a');
    expect(document.activeElement).toBe(tree.getLeaf('a'));
    expect(tabbable(tree)).toEqual(['a']);
  });

  it('keeps focus when an unfocused parent closes', () => {
    const tree = sample();
    (document.getElementById('outside') as HTMLElement).focus();
    tree.close('a');
    expect(document.activeElement?.id).toBe('outside');
  });

  it('moves focus to the tabbable leaf when the focused one is removed', () => {
    const tree = sample();
    tree.getLeaf('a2').focus();
    tree.remove('a2');
    expect(document.activeElement).toBe(tree.getLeaf('a'));
    tree.getLeaf('b').focus();
    tree.remove('a');
    expect(document.activeElement).toBe(tree.getLeaf('b'));
    tree.remove('b');
    expect(document.activeElement).toBe(document.body);
  });
});

describe('context menu', () => {
  const menuOf = () => document.querySelector('.vtree-contextmenu') as HTMLElement | null;
  const itemsOf = () => Array.from(document.querySelectorAll('.vtree-contextmenu-item')) as HTMLElement[];

  const withMenu = () => {
    const calls: string[] = [];
    const tree = sample({
      contextmenu: [
        {
          label: 'Rename <i>it</i>',
          action(id) {
            calls.push(`rename:${id}:${this.label}`);
          }
        },
        {
          label: '<b>Delete</b>',
          html: true,
          action(id) {
            calls.push(`delete:${id}`);
          }
        }
      ]
    });
    return { tree, calls };
  };

  it('opens on a right click on a label, with the menu roles', () => {
    const { tree } = withMenu();
    expect(rightClick(label(tree, 'a2'))).toBe(false);
    const menu = menuOf() as HTMLElement;
    expect(menu.parentNode).toBe(tree.getLeaf('a2'));
    expect(menu.getAttribute('role')).toBe('menu');
    expect(menu.style.display).toBe('block');
    expect(menu.style.top).toBe('0px');
    expect(menu.style.left).toBe('0px');
    const items = itemsOf();
    expect(items.map((item) => item.getAttribute('role'))).toEqual(['menuitem', 'menuitem']);
    expect(items[0].textContent).toBe('Rename <i>it</i>');
    expect(items[1].innerHTML).toBe('<b>Delete</b>');
    expect(document.activeElement).toBe(items[0]);
  });

  it('runs the action with the id and the item as this, then closes', () => {
    const { tree, calls } = withMenu();
    rightClick(label(tree, 'a2'));
    click(itemsOf()[0]);
    expect(calls).toEqual(['rename:a2:Rename <i>it</i>']);
    expect(menuOf()).toBe(null);
    expect(document.activeElement).toBe(tree.getLeaf('a2'));
    expect(tree.getSelected()).toBe(null);
  });

  it('lets an action remove the leaf, and focus goes on to the next tabbable one', () => {
    const tree = sample({ contextmenu: [{ label: 'Delete', action: (id) => tree.remove(id) }] });
    rightClick(label(tree, 'b'));
    click(itemsOf()[0]);
    expect(tree.getLeaf('b', true)).toBe(undefined);
    expect(document.activeElement).toBe(tree.getLeaf('a'));
  });

  it('closes on a click anywhere but not on a right button click', () => {
    const { tree } = withMenu();
    rightClick(label(tree, 'a'));
    click(document.body, 2);
    expect(menuOf()).not.toBe(null);
    click(document.getElementById('outside') as Element);
    expect(menuOf()).toBe(null);
  });

  it('opens one menu on the page at a time', () => {
    const { tree } = withMenu();
    const other = new VanillaTree(root, { contextmenu: [{ label: 'x', action() {} }] }).add({ label: 'O', id: 'o' });
    rightClick(label(tree, 'a'));
    rightClick(label(tree, 'b'));
    expect(document.querySelectorAll('.vtree-contextmenu').length).toBe(1);
    rightClick(label(other, 'o'));
    expect(document.querySelectorAll('.vtree-contextmenu').length).toBe(1);
    expect(menuOf()?.parentNode).toBe(other.getLeaf('o'));
    tree._closeMenu();
    expect(document.querySelectorAll('.vtree-contextmenu').length).toBe(1);
  });

  it('opens only on a label', () => {
    const { tree } = withMenu();
    expect(rightClick(tree.getLeaf('a'))).toBe(true);
    expect(rightClick(tree.tree)).toBe(true);
    expect(menuOf()).toBe(null);
    rightClick(label(tree, 'a'));
    expect(rightClick(menuOf() as HTMLElement)).toBe(true);
  });

  it('works from the keyboard: the context menu key, Shift+F10, arrows, Enter, Space, Escape, Tab', () => {
    const { tree, calls } = withMenu();
    const leaf = tree.getLeaf('a2');
    leaf.focus();
    expect(press(leaf, 'ContextMenu')).toBe(false);
    const items = itemsOf();
    expect(document.activeElement).toBe(items[0]);
    press(items[0], 'ArrowDown');
    expect(document.activeElement).toBe(items[1]);
    press(items[1], 'ArrowDown');
    expect(document.activeElement).toBe(items[0]);
    press(items[0], 'ArrowUp');
    expect(document.activeElement).toBe(items[1]);
    press(items[1], 'Home');
    expect(document.activeElement).toBe(items[0]);
    press(items[0], 'End');
    expect(document.activeElement).toBe(items[1]);
    expect(press(items[1], 'x')).toBe(true);
    press(items[1], 'Escape');
    expect(menuOf()).toBe(null);
    expect(document.activeElement).toBe(leaf);

    press(leaf, 'F10', { shiftKey: true });
    press(itemsOf()[0], 'Tab');
    expect(menuOf()).toBe(null);
    expect(document.activeElement).toBe(leaf);

    press(leaf, 'Apps');
    press(itemsOf()[0], 'Enter');
    expect(document.activeElement).toBe(leaf);
    press(leaf, 'ContextMenu');
    press(itemsOf()[0], 'Down');
    press(itemsOf()[1], ' ');
    press(leaf, 'ContextMenu');
    press(itemsOf()[0], 'Esc');
    expect(menuOf()).toBe(null);
    expect(calls).toEqual(['rename:a2:Rename <i>it</i>', 'delete:a2']);
  });

  it('keeps keys inside the menu away from the tree', () => {
    const { tree } = withMenu();
    tree.getLeaf('a').focus();
    press(tree.getLeaf('a'), 'ContextMenu');
    const log = events(root, ['select', 'close']);
    press(itemsOf()[0], 'ArrowLeft');
    expect(log).toEqual([]);
    expect(menuOf()).not.toBe(null);
  });

  it('opens empty with no items', () => {
    const tree = new VanillaTree(root, { contextmenu: [] }).add({ label: 'A', id: 'a' });
    rightClick(label(tree, 'a'));
    expect(menuOf()?.children.length).toBe(0);
  });

  it('closes when its leaf or a parent of it is removed', () => {
    const { tree } = withMenu();
    rightClick(label(tree, 'a2'));
    tree.remove('b');
    expect(menuOf()).not.toBe(null);
    tree.remove('a');
    expect(menuOf()).toBe(null);
    expect(tree._menu).toBe(null);
  });
});

describe('theme', () => {
  const fakeMedia = (matches: boolean) => {
    const listeners: (() => void)[] = [];
    const list = {
      matches,
      addListener: vi.fn((listener: () => void) => listeners.push(listener)),
      removeListener: vi.fn(),
      change(next: boolean) {
        list.matches = next;
        for (const listener of listeners) listener();
      }
    };
    const matchMedia = vi.fn(() => list);
    vi.stubGlobal('matchMedia', matchMedia);
    return { list, matchMedia };
  };

  it('is light by default and dark with theme: dark', () => {
    expect(new VanillaTree(root).tree.className).toBe('vtree');
    expect(new VanillaTree(root, { theme: 'light' }).tree.className).toBe('vtree');
    expect(new VanillaTree(root, { theme: 'dark' }).tree.className).toBe('vtree vtree-dark');
  });

  it('follows prefers-color-scheme with theme: auto', () => {
    const { list, matchMedia } = fakeMedia(true);
    const tree = new VanillaTree(root, { theme: 'auto' });
    expect(matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    expect(tree.tree.classList.contains('vtree-dark')).toBe(true);
    list.change(false);
    expect(tree.tree.classList.contains('vtree-dark')).toBe(false);
    list.change(true);
    expect(tree.tree.classList.contains('vtree-dark')).toBe(true);
    tree.destroy();
    expect(list.removeListener).toHaveBeenCalledWith(list.addListener.mock.calls[0][0]);
  });

  it('stays light with theme: auto where there is no matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(new VanillaTree(root, { theme: 'auto' }).tree.className).toBe('vtree');
  });
});

describe('destroy', () => {
  it('removes the tree and every listener it added', () => {
    const added = vi.spyOn(document, 'addEventListener');
    const removed = vi.spyOn(document, 'removeEventListener');
    const calls: string[] = [];
    const tree = sample({ contextmenu: [{ label: 'x', action: (id) => calls.push(id) }] });
    expect(added.mock.calls.filter(([type]) => type === 'click').length).toBe(1);
    const { tree: list } = tree;
    rightClick(label(tree, 'a'));
    tree.destroy();
    expect(removed).toHaveBeenCalledWith('click', added.mock.calls[0][1]);
    expect(list.parentNode).toBe(null);
    expect(menuCount()).toBe(0);
    expect(Object.keys(tree.leafs)).toEqual([]);
    expect(() => tree.getLeaf('a')).toThrow();

    // the detached list no longer reacts
    root.appendChild(list);
    const log = events(root, ['select', 'open', 'close']);
    click(list.querySelector('.vtree-leaf-label') as Element);
    click(list.querySelector('.vtree-toggle') as Element);
    press(list.querySelector('li') as Element, 'Enter');
    rightClick(list.querySelector('.vtree-leaf-label') as Element);
    expect(log).toEqual([]);
    expect(menuCount()).toBe(0);
  });

  it('can run twice and after the tree left the page', () => {
    const tree = sample();
    root.innerHTML = '';
    tree.destroy();
    tree.destroy();
    expect(tree.tree.parentNode).toBe(null);
  });

  const menuCount = () => document.querySelectorAll('.vtree-contextmenu').length;
});

describe('events', () => {
  it('bubble with the id in detail', () => {
    const tree = sample();
    let event: CustomEvent | undefined;
    document.addEventListener('vtree-select', (evt) => {
      event = evt as CustomEvent;
    });
    tree.select('a1x');
    expect(event?.bubbles).toBe(true);
    expect(event?.target).toBe(tree.getLeaf('a1x'));
    expect(event?.detail).toEqual({ id: 'a1x' });
  });

  it('are made with createEvent where CustomEvent is not a constructor (IE 10 and 11)', () => {
    const tree = sample();
    vi.stubGlobal('CustomEvent', {});
    const created = vi.spyOn(document, 'createEvent');
    const log = events(root, ['select']);
    tree.select('b');
    expect(created).toHaveBeenCalledWith('CustomEvent');
    expect(log).toEqual(['select:b']);
  });
});
