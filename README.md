vanillatree
===========
Vanilla.js replacement of [jstree](http://www.jstree.com/) for modern browsers

[Live example](http://jsbin.com/mesoju/1/)

![Example Screenshot](http://i.imgur.com/TPlp1ga.png)

## Usage
```js
// treeElement is selector or HTML node, options is optional
var tree = new VanillaTree(treeElement, options);
```
## Options
- ``placeholder`` (string) -- shows if none of leafs is added (optional)
- ``contextmenu`` (array) -- contextual menu items (optional)

### Examples
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
- ``add(options)`` -- Adds leaf. ``id`` option is optional
- ``move(id, parentId)`` -- Moves leaf to another parent
- ``remove(id)`` -- Removes leaf with given id
- ``open(id)`` -- Expands child tree
- ``close(id)`` -- Closes child tree
- ``toggle(id)`` -- Expands or closes child tree dependss on current state
- ``select(id) ``-- Selects leaf with given id

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
VanillaTree uses [dispatchEvent](https://developer.mozilla.org/ru/docs/DOM/element.dispatchEvent) for events triggering. Each event cancelable and bubbles up through the DOM. An id of target element contained in ``evt.detail`` object.

List of possible events:
- ``vtree-add``
- ``vtree-move``
- ``vtree-remove``
- ``vtree-open``
- ``vtree-close``
- ``vtree-select``

### Examples
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

## Which browsers are supported?
VanillaTree uses modern features such as: [classList](https://developer.mozilla.org/en-US/docs/Web/API/Element.classList), [addEventListener](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget.addEventListener) and [dispatchEvent](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget.dispatchEvent), which are supported by new (not newest) browsers including Internet Explorer 10+. If you want to get this script working in Internet Explorer 9, you should attach classList polyfill script on your page, which can be found on [MDN page](https://developer.mozilla.org/en-US/docs/Web/API/Element.classList#wrapper)

## What is vanilla.js?
> Who's using Vanilla JS? Glad you asked! Here are a few:
> Facebook, Google, YouTube, Yahoo, Wikipedia, Windows, Live, Twitter, Amazon, LinkedIn, MSN, eBay, Microsoft, Tumblr, Apple, Pinterest, PayPal, Reddit, Netflix, Stack Overflow

Actually, vanilla.js is funny name of native DOM API. It's more powerful then any Javascript library, including jQuery. Look at [vanilla.js](http://vanilla-js.com/) website for more information.

## Can I use it with jQuery?
Of course! For example, you can use **jQuery.fn.on** syntax instead of **addEventListener** for adding event listeners:
```js
$( treeElement ).on( 'vtree-select', function(evt) {
  alert( evt.detail.id );
}).on( 'vtree-add', function(evt) {
  alert( evt.detail.id );
});
// and so on...
```

**Licensed under WTFPL**

Image sprite licensed under **MIT License** because this is part of [JSTree project](http://www.jstree.com/)
