vanillatree [![npm version](https://badge.fury.io/js/vanillatree.svg)](https://badge.fury.io/js/vanillatree)
===========

Standalone tree view library

[Live demo](http://jsbin.com/nudosewafi/)

![Example Screenshot](http://i.imgur.com/TPlp1ga.png)

## Usage
For CJS env run `npm install --save vanillatree`:
```js
const VanillaTree = require('vanillatree');
```

```js
// treeElement is selector or HTML node, options is optional
const tree = new VanillaTree(treeElement, options);
```
## Options
- ``placeholder`` (string) -- shows if none of leafs is added (optional)
- ``contextmenu`` (array) -- contextual menu items (optional)

### Examples
```js
const tree = new VanillaTree('.my-selector', {
  placeholder: 'No leaf is added yet',
  contextmenu: [{
    label: 'Label 1',
    action(id) {
      // someAction
    }
  },{
    label: 'Label 2',
    action(id) {
      // someAction
    }
  }]
});
```


## Methods
- ``add(options)`` -- Adds a leaf. ``id`` option is optional
- ``move(id, parentId)`` -- Moves a leaf to another parent
- ``remove(id)`` -- Removes a leaf with given id
- ``open(id)`` -- Expands child tree
- ``close(id)`` -- Closes child tree
- ``toggle(id)`` -- Expands or closes child tree depending on current state
- ``select(id) ``-- Selects a leaf with given id

### Examples
```js
tree.add({
  label: 'Label A',
  id: 'a',
  opened: true,
  selected: true
});

tree.add({
  label: 'Label B',
  id: 'b',
  parent: 'a'
});

tree.open('a');
```

## Events
`VanillaTree` uses [dispatchEvent](https://developer.mozilla.org/ru/docs/DOM/element.dispatchEvent) for events triggering. Each event is cancelable and bubbles up through the DOM. An id of a target element is placed at ``evt.detail`` object.

A list of possible events:
- ``vtree-add``
- ``vtree-move``
- ``vtree-remove``
- ``vtree-open``
- ``vtree-close``
- ``vtree-select``

### Examples
```js
treeElement.addEventListener('vtree-open', (evt) => {
  info.innerHTML = evt.detail.id + ' is opened';
});

treeElement.addEventListener('vtree-close', (evt) => {
  info.innerHTML = evt.detail.id + ' is closed';
});

treeElement.addEventListener('vtree-select', (evt) => {
  info.innerHTML = evt.detail.id + ' is selected';
});
```

Image sprite is the part of [JSTree project](http://www.jstree.com/)
