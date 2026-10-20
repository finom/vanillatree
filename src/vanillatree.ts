export interface ContextMenuItem {
  /** Text of the menu item. */
  label: string;
  /** Write `label` as HTML instead of text. Only for HTML you trust. */
  html?: boolean;
  /** Called with the id of the leaf the menu was opened on; `this` is the item. */
  action(this: ContextMenuItem, id: string): void;
}

export interface VanillaTreeOptions {
  /** Text shown while the tree has no leaves. */
  placeholder?: string;
  /** Items of the menu that opens on a right click, the context menu key or Shift+F10 on a leaf. */
  contextmenu?: ContextMenuItem[];
  /** `'dark'` adds the `vtree-dark` class to the tree; `'auto'` follows `prefers-color-scheme`. */
  theme?: 'light' | 'dark' | 'auto';
}

export interface LeafOptions {
  /** Text of the leaf. */
  label: string;
  /** Unique id; generated (`vtree-1`, `vtree-2`, …) when omitted. */
  id?: string | number;
  /** Id of the parent leaf; a root leaf when omitted. */
  parent?: string | number;
  /** Write `label` as HTML instead of text. Only for HTML you trust. */
  html?: boolean;
  /** Show the children; closed by default. */
  opened?: boolean;
  /** Select the leaf once it is added. */
  selected?: boolean;
  /** `false`: the leaf can't be selected; a click on its label opens or closes it instead. */
  selectable?: boolean;
}

export interface VanillaTreeEventDetail {
  id: string;
}

type Key = string | number;
type Root = string | Element | ArrayLike<Element>;

// tsimmes (https://github.com/finom/tsimmes) without its HTML parsing: a selector (inside a context), a node or an
// array-like of nodes becomes an array
const $ = (s: Root | null | undefined, context?: Element): Element[] => {
  let found: ArrayLike<Element> = [];
  if (s) {
    if ((s as Element).dispatchEvent) found = [s as Element];
    else if (typeof s === 'string') found = (context || document).querySelectorAll(s);
    else found = s as ArrayLike<Element>;
  }
  const items: Element[] = [];
  for (let i = 0; i < found.length; i++) items.push(found[i]);
  return items;
};

// IE 10 and 11 name some keys differently
const OLD_KEYS: Record<string, string> = {
  Down: 'ArrowDown',
  Up: 'ArrowUp',
  Left: 'ArrowLeft',
  Right: 'ArrowRight',
  Spacebar: ' ',
  Esc: 'Escape',
  Apps: 'ContextMenu'
};
const keyOf = (evt: KeyboardEvent) =>
  // biome-ignore lint/suspicious/noPrototypeBuiltins: Object.hasOwn is newer than IE 11
  Object.prototype.hasOwnProperty.call(OLD_KEYS, evt.key) ? OLD_KEYS[evt.key] : evt.key;

let instances = 0;

const create = (tagName: string, className: string, attributes?: Record<string, string>): HTMLElement => {
  const element = document.createElement(tagName);
  element.className = className;
  for (const name in attributes) element.setAttribute(name, attributes[name]);
  return element;
};

const write = (element: HTMLElement, text: string, html?: boolean) => {
  if (html) element.innerHTML = text;
  else element.textContent = text;
};

const has = (element: Element, className: string) => element.classList.contains(className);

// classList.toggle's second argument doesn't work in IE 10 and 11
const setClass = (element: Element, className: string, on: boolean) => {
  if (on) element.classList.add(className);
  else element.classList.remove(className);
};

const dispatch = (target: EventTarget, name: string, id: string) => {
  const type = `vtree-${name}`;
  const detail: VanillaTreeEventDetail = { id };
  let event: CustomEvent<VanillaTreeEventDetail>;
  if (typeof CustomEvent === 'function') {
    event = new CustomEvent(type, { bubbles: true, cancelable: true, detail });
  } else {
    // IE 10 and 11
    event = document.createEvent('CustomEvent');
    event.initCustomEvent(type, true, true, detail);
  }
  target.dispatchEvent(event);
};

export default class VanillaTree {
  /** The element the tree is rendered into. */
  container: Element;
  /** The tree's root list, `ul.vtree`. */
  tree: HTMLElement;
  placeholder?: string;
  /** The options each leaf was added with, by id. */
  leafs: Record<string, LeafOptions>;

  _options: VanillaTreeOptions;
  _nodes: Record<string, HTMLElement>;
  _prefix: string;
  _count: number;
  _selected: string | null;
  _tabbable: string | null;
  _menu: HTMLElement | null;
  _onClick: (evt: MouseEvent) => void;
  _onKeyDown: (evt: KeyboardEvent) => void;
  _onFocus: (evt: FocusEvent) => void;
  _onContextMenu: (evt: MouseEvent) => void;
  _onDocumentClick: (evt: MouseEvent) => void;
  _onScheme: () => void;
  _scheme: MediaQueryList | null;

  constructor(container: Root, options?: VanillaTreeOptions) {
    const element = $(container)[0];
    if (!element) throw Error(`VanillaTree: no element for ${String(container)}`);
    this.container = element;
    this._options = options || {};
    this.placeholder = this._options.placeholder;
    this.leafs = Object.create(null);
    this._nodes = Object.create(null);
    this._prefix = `vtree-${++instances}-`;
    this._count = 0;
    this._selected = null;
    this._tabbable = null;
    this._menu = null;
    this._scheme = null;

    const tree = create('ul', 'vtree', { role: 'tree' });
    this.tree = tree;
    this._onClick = (evt) => this._click(evt);
    this._onKeyDown = (evt) => this._keyDown(evt);
    this._onFocus = (evt) => this._focusIn(evt);
    this._onContextMenu = (evt) => this._contextMenu(evt);
    this._onDocumentClick = (evt) => {
      if (evt.button !== 2) this._closeMenu();
    };
    this._onScheme = () => setClass(tree, 'vtree-dark', !!this._scheme?.matches);

    tree.addEventListener('click', this._onClick);
    tree.addEventListener('keydown', this._onKeyDown);
    tree.addEventListener('focus', this._onFocus, true);
    if (this._options.contextmenu) {
      tree.addEventListener('contextmenu', this._onContextMenu);
      document.addEventListener('click', this._onDocumentClick);
    }

    const { theme } = this._options;
    if (theme === 'dark') tree.classList.add('vtree-dark');
    else if (theme === 'auto' && typeof matchMedia === 'function') {
      this._scheme = matchMedia('(prefers-color-scheme: dark)');
      // addListener: Safari before 14 has no addEventListener on a media query list
      this._scheme.addListener(this._onScheme);
      this._onScheme();
    }

    element.appendChild(tree);
    this._placeholder();
  }

  /** The leaf's `li` element; throws for an unknown id unless `notThrow` is set. */
  getLeaf(id: Key, notThrow: true): HTMLElement | undefined;
  getLeaf(id: Key, notThrow?: boolean): HTMLElement;
  getLeaf(id: Key, notThrow?: boolean): HTMLElement | undefined {
    const leaf = this._nodes[id];
    if (!leaf && !notThrow) throw Error(`No VanillaTree leaf with id "${id}"`);
    return leaf;
  }

  /** The `ul` holding the leaf's children (created when missing), or the root list without an id. */
  getChildList(id?: Key | null): HTMLElement {
    if (id == null) return this.tree;
    const leaf = this.getLeaf(id);
    let list = this._subtree(leaf);
    if (!list) list = leaf.appendChild(create('ul', 'vtree-subtree', { role: 'group' }));
    return list;
  }

  /** The id of the leaf's parent, `null` for a root leaf. */
  getParent(id: Key): string | null {
    const list = this.getLeaf(id).parentNode as HTMLElement;
    return list === this.tree ? null : this._id(list.parentNode as HTMLElement);
  }

  /** Ids from the root leaf down to the leaf itself. */
  getPath(id: Key): string[] {
    const path: string[] = [];
    for (let current: string | null = this._id(this.getLeaf(id)); current !== null; current = this.getParent(current)) {
      path.unshift(current);
    }
    return path;
  }

  /** The id of the selected leaf, `null` when none is. */
  getSelected(): string | null {
    return this._selected;
  }

  /** Whether the leaf has children. */
  hasChildren(id: Key): boolean {
    const list = this._subtree(this.getLeaf(id));
    return !!list && list.children.length > 0;
  }

  add(options: LeafOptions): this {
    const id = options.id == null || options.id === '' ? this._newId() : String(options.id);
    if (this._nodes[id]) throw Error(`VanillaTree leaf with id "${id}" already exists`);
    const parentList = this.getChildList(options.parent);
    const labelId = this._prefix + ++this._count;
    const leaf = create('li', 'vtree-leaf', {
      'data-vtree-id': id,
      role: 'treeitem',
      tabindex: '-1',
      'aria-labelledby': labelId
    });
    leaf.appendChild(create('span', 'vtree-toggle', { 'aria-hidden': 'true' }));
    write(leaf.appendChild(create('a', 'vtree-leaf-label', { id: labelId })), options.label, options.html);
    if (options.selectable !== false) leaf.setAttribute('aria-selected', 'false');
    if (!options.opened) leaf.classList.add('closed');

    parentList.appendChild(leaf);
    this._nodes[id] = leaf;
    this.leafs[id] = options;
    if (parentList !== this.tree) this._sync(parentList.parentNode as HTMLElement);

    if (options.selected) this.select(id);
    this._placeholder()._fixTabbable();
    dispatch(leaf, 'add', id);
    return this;
  }

  /** Moves the leaf under another parent, or to the root without `parentId`. */
  move(id: Key, parentId?: Key | null): this {
    const leaf = this.getLeaf(id);
    const key = this._id(leaf);
    if (parentId != null) {
      for (
        let current: string | null = this._id(this.getLeaf(parentId));
        current !== null;
        current = this.getParent(current)
      ) {
        if (current === key) throw Error(`VanillaTree can't move leaf "${key}" into itself`);
      }
    }
    const oldList = leaf.parentNode as HTMLElement;
    this.getChildList(parentId).appendChild(leaf);
    this.leafs[key].parent = parentId == null ? undefined : String(parentId);
    this._syncList(oldList);
    this._syncList(leaf.parentNode as HTMLElement);
    this._placeholder()._fixTabbable();
    dispatch(leaf, 'move', key);
    return this;
  }

  /** Removes the leaf and its children. */
  remove(id: Key): this {
    const leaf = this.getLeaf(id);
    const key = this._id(leaf);
    const list = leaf.parentNode as HTMLElement;
    if (this._menu && leaf.contains(this._menu)) this._closeMenu();
    const removed = [leaf, ...$(leaf.querySelectorAll('li.vtree-leaf'))];
    for (const node of removed) {
      const nodeId = this._id(node);
      delete this._nodes[nodeId];
      delete this.leafs[nodeId];
      if (this._selected === nodeId) this._selected = null;
      if (this._tabbable === nodeId) this._tabbable = null;
    }
    const focused = leaf.contains(document.activeElement);
    list.removeChild(leaf);
    this._syncList(list);
    this._placeholder()._fixTabbable();
    if (focused && this._tabbable !== null) this._nodes[this._tabbable].focus();
    dispatch(this.tree, 'remove', key);
    return this;
  }

  /** Shows the leaf's children. */
  open(id: Key): this {
    const leaf = this.getLeaf(id);
    leaf.classList.remove('closed');
    this._sync(leaf);
    dispatch(leaf, 'open', this._id(leaf));
    return this;
  }

  /** Hides the leaf's children. */
  close(id: Key): this {
    const leaf = this.getLeaf(id);
    leaf.classList.add('closed');
    this._sync(leaf);
    const active = document.activeElement;
    if (active !== leaf && leaf.contains(active)) leaf.focus();
    this._fixTabbable();
    dispatch(leaf, 'close', this._id(leaf));
    return this;
  }

  /** Opens a closed leaf, closes an open one. */
  toggle(id: Key): this {
    return has(this.getLeaf(id), 'closed') ? this.open(id) : this.close(id);
  }

  /** Selects the leaf; does nothing for a leaf added with `selectable: false`. */
  select(id: Key): this {
    const leaf = this.getLeaf(id);
    const key = this._id(leaf);
    if (this.leafs[key].selectable === false || this._selected === key) return this;
    if (this._selected !== null) {
      const previous = this._nodes[this._selected];
      previous.classList.remove('vtree-selected');
      previous.setAttribute('aria-selected', 'false');
    }
    leaf.classList.add('vtree-selected');
    leaf.setAttribute('aria-selected', 'true');
    this._selected = key;
    this._setTabbable(key);
    this._fixTabbable();
    dispatch(leaf, 'select', key);
    return this;
  }

  /** Removes the tree from the page and every listener it added; the instance can't be used after it. */
  destroy(): void {
    const { tree } = this;
    this._closeMenu();
    tree.removeEventListener('click', this._onClick);
    tree.removeEventListener('keydown', this._onKeyDown);
    tree.removeEventListener('focus', this._onFocus, true);
    tree.removeEventListener('contextmenu', this._onContextMenu);
    document.removeEventListener('click', this._onDocumentClick);
    if (this._scheme) this._scheme.removeListener(this._onScheme);
    this._scheme = null;
    if (tree.parentNode) tree.parentNode.removeChild(tree);
    this.leafs = Object.create(null);
    this._nodes = Object.create(null);
    this._selected = null;
    this._tabbable = null;
  }

  _id(leaf: Element): string {
    return leaf.getAttribute('data-vtree-id') as string;
  }

  _newId(): string {
    let id: string;
    do id = `vtree-${++this._count}`;
    while (this._nodes[id]);
    return id;
  }

  _subtree(leaf: Element): HTMLElement | undefined {
    const { children } = leaf;
    for (let i = 0; i < children.length; i++) if (has(children[i], 'vtree-subtree')) return children[i] as HTMLElement;
  }

  // the leaf's has-children class and aria-expanded follow its child list
  _sync(leaf: HTMLElement): void {
    const id = this._id(leaf);
    const parent = this.hasChildren(id);
    setClass(leaf, 'vtree-has-children', parent);
    if (parent) leaf.setAttribute('aria-expanded', String(!has(leaf, 'closed')));
    else leaf.removeAttribute('aria-expanded');
  }

  _syncList(list: HTMLElement): void {
    if (list !== this.tree) this._sync(list.parentNode as HTMLElement);
  }

  _placeholder(): this {
    const { tree } = this;
    const current = $('.vtree-placeholder', tree)[0];
    const empty = !$('li.vtree-leaf', tree).length;
    if (empty && this.placeholder && !current) {
      write(tree.appendChild(create('li', 'vtree-placeholder', { role: 'none' })), this.placeholder);
    } else if (!empty && current) {
      tree.removeChild(current);
    }
    return this;
  }

  // the leaf itself, or its outermost closed ancestor when a parent hides it
  _visible(leaf: HTMLElement): HTMLElement {
    let visible = leaf;
    for (let node = leaf.parentNode as HTMLElement; node !== this.tree; node = node.parentNode as HTMLElement) {
      if (has(node, 'vtree-leaf') && has(node, 'closed')) visible = node;
    }
    return visible;
  }

  // a list of the visible leaves, top to bottom, as the keyboard walks them
  _visibleLeaves(): HTMLElement[] {
    const leaves: HTMLElement[] = [];
    const walk = (list: Element) => {
      const { children } = list;
      for (let i = 0; i < children.length; i++) {
        // only leaves: the placeholder is there only while there are none
        const leaf = children[i] as HTMLElement;
        leaves.push(leaf);
        const subtree = this._subtree(leaf);
        if (subtree && !has(leaf, 'closed')) walk(subtree);
      }
    };
    walk(this.tree);
    return leaves;
  }

  // one leaf has tabindex 0, so Tab reaches the tree once (roving tabindex)
  _setTabbable(id: string): void {
    if (this._tabbable === id) return;
    if (this._tabbable !== null) this._nodes[this._tabbable].setAttribute('tabindex', '-1');
    this._tabbable = id;
    this._nodes[id].setAttribute('tabindex', '0');
  }

  // the tabbable leaf stays visible: a closed parent takes it over, and an empty slot goes to the selected or first leaf
  _fixTabbable(): void {
    const id = this._tabbable ?? this._selected;
    if (id !== null) {
      this._setTabbable(this._id(this._visible(this._nodes[id])));
    } else {
      const first = $('li.vtree-leaf', this.tree)[0];
      if (first) this._setTabbable(this._id(first));
    }
  }

  _focus(leaf: HTMLElement): void {
    this._setTabbable(this._id(leaf));
    leaf.focus();
  }

  // the leaf of this tree an event happened in; with a class name, only inside an element with that class
  _leafOf(target: EventTarget | null, className?: string): HTMLElement | undefined {
    let matched = !className;
    for (let node = target as HTMLElement | null; node && node !== this.tree; node = node.parentNode as HTMLElement) {
      if (has(node, 'vtree-contextmenu')) return;
      if (className && has(node, className)) matched = true;
      // a leaf of another tree, rendered inside a label's HTML, is not this tree's
      if (has(node, 'vtree-leaf')) return matched && this._nodes[this._id(node)] === node ? node : undefined;
    }
  }

  _click(evt: MouseEvent): void {
    const toggled = this._leafOf(evt.target, 'vtree-toggle');
    if (toggled) {
      this.toggle(this._id(toggled));
      return;
    }
    const labelled = this._leafOf(evt.target, 'vtree-leaf-label');
    if (!labelled) return;
    const id = this._id(labelled);
    if (this.leafs[id].selectable === false) {
      if (this.hasChildren(id)) this.toggle(id);
    } else this.select(id);
  }

  _focusIn(evt: FocusEvent): void {
    const leaf = this._leafOf(evt.target);
    if (leaf && leaf === evt.target) this._setTabbable(this._id(leaf));
  }

  _keyDown(evt: KeyboardEvent): void {
    const leaf = evt.target as HTMLElement;
    if (!has(leaf, 'vtree-leaf') || this._leafOf(leaf) !== leaf) return;
    const key = keyOf(evt);
    const id = this._id(leaf);
    const parent = this.hasChildren(id);
    const opened = parent && !has(leaf, 'closed');
    const leaves = this._visibleLeaves();
    const index = leaves.indexOf(leaf);

    if (key === 'ArrowDown') {
      if (index < leaves.length - 1) this._focus(leaves[index + 1]);
    } else if (key === 'ArrowUp') {
      if (index > 0) this._focus(leaves[index - 1]);
    } else if (key === 'Home') {
      this._focus(leaves[0]);
    } else if (key === 'End') {
      this._focus(leaves[leaves.length - 1]);
    } else if (key === 'ArrowRight') {
      if (opened) this._focus(leaves[index + 1]);
      else if (parent) this.open(id);
    } else if (key === 'ArrowLeft') {
      const parentId = this.getParent(id);
      if (opened) this.close(id);
      else if (parentId !== null) this._focus(this._nodes[parentId]);
    } else if (key === 'Enter' || key === ' ') {
      if (this.leafs[id].selectable !== false) this.select(id);
      else if (parent) this.toggle(id);
    } else if (key === 'ContextMenu' || (key === 'F10' && evt.shiftKey)) {
      if (!this._options.contextmenu) return;
      this._openMenu(leaf);
    } else return;
    evt.preventDefault();
  }

  _contextMenu(evt: MouseEvent): void {
    const leaf = this._leafOf(evt.target, 'vtree-leaf-label');
    if (!leaf) return;
    evt.preventDefault();
    evt.stopPropagation();
    this._openMenu(leaf);
  }

  _openMenu(leaf: HTMLElement): void {
    // one context menu on the page at a time, as a native one
    for (const open of $('.vtree-contextmenu')) (open.parentNode as Element).removeChild(open);
    const id = this._id(leaf);
    const label = $('.vtree-leaf-label', leaf)[0] as HTMLElement;
    const menu = create('menu', 'vtree-contextmenu', { role: 'menu' });
    this._menu = menu;
    menu.style.top = `${label.offsetTop + label.getBoundingClientRect().height}px`;
    menu.style.left = `${label.offsetLeft}px`;
    menu.style.display = 'block';

    const items = (this._options.contextmenu as ContextMenuItem[]).map((item) => {
      const element = menu.appendChild(create('li', 'vtree-contextmenu-item', { role: 'menuitem', tabindex: '-1' }));
      write(element, item.label, item.html);
      element.addEventListener('click', () => {
        // focus goes back to the leaf before the action, which may move it on
        this._closeMenu();
        leaf.focus();
        item.action.call(item, id);
      });
      return element;
    });

    menu.addEventListener('keydown', (evt) => {
      const key = keyOf(evt);
      const index = items.indexOf(evt.target as HTMLElement);
      if (key === 'ArrowDown') items[(index + 1) % items.length].focus();
      else if (key === 'ArrowUp') items[(index + items.length - 1) % items.length].focus();
      else if (key === 'Home') items[0].focus();
      else if (key === 'End') items[items.length - 1].focus();
      else if (key === 'Enter' || key === ' ') items[index].click();
      else if (key === 'Escape' || key === 'Tab') {
        this._closeMenu();
        leaf.focus();
      } else return;
      evt.preventDefault();
      evt.stopPropagation();
    });

    leaf.appendChild(menu);
    if (items.length) items[0].focus();
  }

  _closeMenu(): void {
    const menu = this._menu;
    if (menu?.parentNode) menu.parentNode.removeChild(menu);
    this._menu = null;
  }
}

export { VanillaTree };
