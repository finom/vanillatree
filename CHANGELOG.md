# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0] - 2026-10-20

The library is rewritten in TypeScript, with no dependencies. The script-tag bundle still runs in Internet Explorer 10 and 11.

### Breaking

- A label is written as text. `html: true` on a leaf or a context menu item writes it as HTML; `placeholder` is always text ([#6](https://github.com/finom/vanillatree/pull/6)).
- Adding a leaf with an id that is already there throws ([#8](https://github.com/finom/vanillatree/issues/8)).
- `add` no longer fires `vtree-close` for each closed leaf it adds.
- The files are in `dist/`: `vanillatree.min.js` (UMD: script tag, CommonJS, AMD), `vanillatree.min.mjs` (ES module), `vanillatree.css`, and the types. `vanillatree/vanillatree.css` still resolves through the package's exports. `vanillatree.js` (unminified) is gone.
- The root list has no padding of its own.
- Generated ids are `vtree-1`, `vtree-2`, … instead of random numbers.

### Added

- Keyboard and screen reader support (the WAI-ARIA tree view pattern): ARIA roles and states, one leaf in the tab order, arrow keys, Home, End, Enter and Space; the context menu opens with the context menu key or Shift+F10 and works from the keyboard.
- `selectable: false` for a leaf that can't be selected; a click on its label opens or closes it ([#11](https://github.com/finom/vanillatree/issues/11)).
- `getPath(id)` and `getParent(id)` ([#10](https://github.com/finom/vanillatree/issues/10)), `hasChildren(id)` ([#11](https://github.com/finom/vanillatree/issues/11)), `getSelected()`.
- `destroy()` removes the tree and every listener it added, including the `document` listener of the context menu.
- A dark theme: the `theme` option (`'light'`, `'dark'`, `'auto'`) or a `vtree-dark` class on any ancestor. The colors are CSS variables.
- An ES module build, TypeScript types for `import` and `require`, and the `VanillaTree` named export.

### Fixed

- A click on HTML inside a label (a `<b>`, an icon) selects the leaf ([#7](https://github.com/finom/vanillatree/issues/7)).
- `move` and `remove` set `vtree-has-children` right in IE 10 and 11, where `classList.toggle` ignores its second argument.
- `move` and `remove` of a root leaf no longer change the container's classes.
- `remove` forgets the ids of the removed leaf's children, so they can be added again.
- Moving a leaf under itself or its own child throws a clear error instead of a DOM error.
- An id with a quote or a bracket in it works: leaves are found by id, not by a selector.
- A tree inside another tree's label no longer has its clicks and keys handled by the outer tree.

[Unreleased]: https://github.com/finom/vanillatree/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/finom/vanillatree/releases/tag/v1.0.0
