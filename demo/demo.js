// The demo on https://finom.github.io/vanillatree/: the script-tag bundle, as a page without a build uses it.
const { VanillaTree } = window;
const html = document.documentElement;
const themeSelect = document.getElementById('theme');
const log = document.getElementById('log');
const dark = window.matchMedia('(prefers-color-scheme: dark)');

const tree = new VanillaTree('#tree', {
  placeholder: 'No files. Add one with the button below.',
  contextmenu: [
    {
      label: 'Open or close',
      action: (id) => tree.toggle(id)
    },
    {
      label: 'Add a file here',
      action: (id) => addFile(tree.leafs[id].selectable === false ? id : tree.getParent(id))
    },
    {
      label: 'Move to the top level',
      action: (id) => tree.move(id)
    },
    {
      label: 'Remove',
      action: (id) => tree.remove(id)
    }
  ]
});

const folder = (id, label, parent, opened) => tree.add({ id, label, parent, opened, selectable: false });
const file = (label, parent, selected) => tree.add({ label, parent, selected });

folder('src', 'src', undefined, true);
folder('components', 'components', 'src', true);
file('Tree.ts', 'components');
file('ContextMenu.ts', 'components');
folder('styles', 'styles', 'src');
file('tree.css', 'styles');
file('index.ts', 'src', true);
folder('test', 'test');
file('tree.test.ts', 'test');
file('README.md');
file('package.json');

let files = 0;
const addFile = (parent) => {
  files += 1;
  tree.add({ label: `new-file-${files}.ts`, parent: parent ?? undefined, selected: true });
  if (parent) tree.open(parent);
};

tree.tree.setAttribute('aria-labelledby', 'tree-heading');

document.getElementById('add').addEventListener('click', () => {
  const id = tree.getSelected();
  addFile(id === null ? null : tree.getParent(id));
});
document.getElementById('remove').addEventListener('click', () => {
  const id = tree.getSelected();
  if (id !== null) tree.remove(id);
});
const each = (fn) => {
  for (const id of Object.keys(tree.leafs)) if (tree.hasChildren(id)) fn(id);
};
document.getElementById('open-all').addEventListener('click', () => each((id) => tree.open(id)));
document.getElementById('close-all').addEventListener('click', () => each((id) => tree.close(id)));

const describe = (id) => {
  const leaf = tree.leafs[id];
  return leaf ? leaf.label : id;
};
for (const name of ['add', 'move', 'remove', 'open', 'close', 'select']) {
  tree.container.addEventListener(`vtree-${name}`, (evt) => {
    const item = document.createElement('li');
    item.textContent = `vtree-${name}: ${describe(evt.detail.id)}`;
    log.insertBefore(item, log.firstChild);
    while (log.children.length > 50) log.removeChild(log.lastChild);
  });
}

// the page and the tree share one theme: the tree reads `vtree-dark` from <html>
const applyTheme = () => {
  let theme = themeSelect.value;
  if (theme === 'auto') theme = dark.matches ? 'dark' : 'light';
  html.setAttribute('data-theme', theme);
  html.classList.toggle('vtree-dark', theme === 'dark');
};
// ?theme=light|dark|auto picks one for a link or a screenshot
const asked = new URLSearchParams(location.search).get('theme');
try {
  themeSelect.value = asked || localStorage.getItem('vanillatree-theme') || 'auto';
} catch {
  themeSelect.value = asked || 'auto';
}
if (!themeSelect.value) themeSelect.value = 'auto';
themeSelect.addEventListener('change', () => {
  try {
    localStorage.setItem('vanillatree-theme', themeSelect.value);
  } catch {}
  applyTheme();
});
dark.addEventListener('change', applyTheme);
applyTheme();
