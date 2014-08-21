vanillatree
===========
Vanilla.js replacement of jstree
Example: http://jsbin.com/puquviroxaki/1/edit
## Usage
```js
// treeElement is selector or HTML node, options is optional
var tree = new VanillaTree(treeElement, options);
```
## Options
- ``placeholder`` (string) -- shows if none of leafs is added (optional)
- ``contextmenu`` (array) -- contextual menu items (optional)
```js
var tree = new VanillaTree('.my-selector', {
  placeholder: 'None of leafs is added yet',
  contextmenu: [{
    label: 'Label 1',
    action: function(id) {
      // someAction
    }
  },{
    label: 'Label 2',
    action: function(id) {
      // someAction
    }
  }]
});
```


## Methods
- ``add(options)`` -- Adds leaf. id option is optional
- ``move(id, parentId)`` -- Moves leaf to another parent
- ``remove(id)`` -- Removes leaf with given id
- ``open(id)`` -- Expands child tree
- ``close(id)`` -- Closes child tree
- ``toggle(id)`` -- Expands or closes child tree dependss on current state
- ``select(id) ``-- Selects leaf with given id

```js
tree.add({
  label: 'Label A',
  id: 'a',
  opened: true
});

tree.add({
  label: 'Label B',
  id: 'b',
  parent: 'a'
});
_dispatch
tree.open('a');
```

## Events
- vtree-add
- vtree-move
- vtree-remove
- vtree-open
- vtree-close
- vtree-select

```js
treeElement.addEventListener('vtree-open', function(evt) {
  info.innerHTML = evt.detail.id + ' is opened';
});

treeElement.addEventListener('vtree-close', function(evt) {
  info.innerHTML = evt.detail.id + ' is closed';
});

treeElement.addEventListener('vtree-select', function(evt) {
  info.innerHTML = evt.detail.id + ' is selected';
});
```
