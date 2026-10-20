// The legacy check: ES5 only, so it runs as is in IE 10 and 11 (test/legacy/index.html) and in
// scripts/check-legacy-run.mjs, which loads dist/vanillatree.min.js into a page without the APIs IE 10 lacks.
// Events are made the way IE makes them (createEvent), with IE's key names.
(function () {
  var VanillaTree = window.VanillaTree;
  var root = document.getElementById('legacy-root');
  var cases = [];
  var test = function (name, fn) {
    cases.push({ name: name, fn: fn });
  };
  var equal = function (actual, expected, what) {
    if (actual !== expected) throw new Error(what + ': expected ' + expected + ', got ' + actual);
  };
  var fresh = function (options) {
    root.innerHTML = '';
    return new VanillaTree(root, options)
      .add({ label: 'A', id: 'a', opened: true })
      .add({ label: 'A1', id: 'a1', parent: 'a' })
      .add({ label: 'A1x', id: 'a1x', parent: 'a1' })
      .add({ label: 'B', id: 'b' });
  };
  var label = function (tree, id) {
    return tree.getLeaf(id).querySelector('.vtree-leaf-label');
  };
  var mouse = function (node, type) {
    var event = document.createEvent('MouseEvent');
    event.initMouseEvent(type, true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
    return node.dispatchEvent(event);
  };
  var key = function (node, name, shiftKey) {
    var event = document.createEvent('Event');
    event.initEvent('keydown', true, true);
    Object.defineProperty(event, 'key', { value: name });
    Object.defineProperty(event, 'shiftKey', { value: !!shiftKey });
    return node.dispatchEvent(event);
  };
  var has = function (node, className) {
    return (' ' + node.className + ' ').indexOf(' ' + className + ' ') !== -1;
  };

  test('add, text and HTML labels, placeholder', function () {
    root.innerHTML = '';
    var tree = new VanillaTree(root, { placeholder: 'empty' });
    equal(root.querySelector('.vtree-placeholder').textContent, 'empty', 'placeholder');
    tree.add({ label: '<b>x</b>', id: 't' }).add({ label: '<b>x</b>', id: 'h', html: true });
    equal(label(tree, 't').textContent, '<b>x</b>', 'text label');
    equal(label(tree, 'h').getElementsByTagName('b').length, 1, 'HTML label');
    equal(root.querySelector('.vtree-placeholder'), null, 'placeholder gone');
    var threw = false;
    try {
      tree.add({ label: 'again', id: 't' });
    } catch (_error) {
      threw = true;
    }
    equal(threw, true, 'a duplicate id throws');
  });

  test('events through createEvent', function () {
    var tree = fresh();
    var seen = [];
    root.addEventListener('vtree-select', function (event) {
      seen.push(event.detail.id);
    });
    tree.select('b');
    equal(seen.join(), 'b', 'select event');
  });

  test('move and remove keep has-children right', function () {
    var tree = fresh();
    tree.move('a1', 'b');
    equal(has(tree.getLeaf('a'), 'vtree-has-children'), false, 'a without children');
    equal(has(tree.getLeaf('b'), 'vtree-has-children'), true, 'b with children');
    equal(tree.getPath('a1x').join('/'), 'b/a1/a1x', 'path');
    tree.remove('a1');
    equal(has(tree.getLeaf('b'), 'vtree-has-children'), false, 'b after remove');
    equal(tree.getLeaf('a1x', true), undefined, 'child forgotten');
  });

  test('clicks: select, toggle, a label with HTML in it', function () {
    var tree = fresh().add({ label: '<i>deep</i>', id: 'h', html: true });
    mouse(label(tree, 'a1'), 'click');
    equal(has(tree.getLeaf('a1'), 'vtree-selected'), true, 'selected');
    mouse(tree.getLeaf('a').querySelector('.vtree-toggle'), 'click');
    equal(has(tree.getLeaf('a'), 'closed'), true, 'closed');
    equal(has(tree.getLeaf('a'), 'vtree-has-children'), true, 'still a parent after close');
    equal(tree.getLeaf('a').getAttribute('aria-expanded'), 'false', 'aria-expanded');
    mouse(label(tree, 'h').getElementsByTagName('i')[0], 'click');
    equal(has(tree.getLeaf('h'), 'vtree-selected'), true, 'selected through the inner element');
  });

  test("keyboard with IE's key names", function () {
    var tree = fresh();
    tree.getLeaf('a').focus();
    key(tree.getLeaf('a'), 'Down');
    equal(document.activeElement, tree.getLeaf('a1'), 'Down');
    key(tree.getLeaf('a1'), 'Right');
    equal(has(tree.getLeaf('a1'), 'closed'), false, 'Right opens');
    equal(has(tree.getLeaf('a1'), 'vtree-has-children'), true, 'still a parent after open');
    key(tree.getLeaf('a1'), 'Right');
    equal(document.activeElement, tree.getLeaf('a1x'), 'Right enters');
    key(tree.getLeaf('a1x'), 'Left');
    equal(document.activeElement, tree.getLeaf('a1'), 'Left leaves');
    key(tree.getLeaf('a1'), 'Spacebar');
    equal(has(tree.getLeaf('a1'), 'vtree-selected'), true, 'Spacebar selects');
    equal(tree.getLeaf('a1').getAttribute('tabindex'), '0', 'tabbable');
    key(tree.getLeaf('a1'), 'End');
    equal(document.activeElement, tree.getLeaf('b'), 'End');
  });

  test('context menu: right click, Apps key, Shift+F10, Esc', function () {
    var calls = [];
    var tree = fresh({
      contextmenu: [
        {
          label: 'One',
          action: function (id) {
            calls.push(id);
          }
        },
        { label: 'Two', action: function () {} }
      ]
    });
    equal(mouse(label(tree, 'b'), 'contextmenu'), false, 'default prevented');
    var items = root.querySelectorAll('.vtree-contextmenu-item');
    equal(items.length, 2, 'items');
    mouse(items[0], 'click');
    equal(calls.join(), 'b', 'action');
    equal(root.querySelector('.vtree-contextmenu'), null, 'closed');

    tree.getLeaf('a').focus();
    key(tree.getLeaf('a'), 'Apps');
    items = root.querySelectorAll('.vtree-contextmenu-item');
    equal(document.activeElement, items[0], 'first item focused');
    key(items[0], 'Down');
    equal(document.activeElement, items[1], 'Down');
    key(items[1], 'Esc');
    equal(root.querySelector('.vtree-contextmenu'), null, 'Esc closes');
    equal(document.activeElement, tree.getLeaf('a'), 'focus back');
    key(tree.getLeaf('a'), 'F10', true);
    equal(root.querySelectorAll('.vtree-contextmenu').length, 1, 'Shift+F10');
    mouse(document.body, 'click');
    equal(root.querySelector('.vtree-contextmenu'), null, 'a click closes');
  });

  test('theme: dark and auto with addListener', function () {
    root.innerHTML = '';
    equal(has(new VanillaTree(root, { theme: 'dark' }).tree, 'vtree-dark'), true, 'dark');
    var listeners = [];
    var list = {
      matches: true,
      addListener: function (fn) {
        listeners.push(fn);
      },
      removeListener: function () {
        listeners.length = 0;
      }
    };
    var original = window.matchMedia;
    var tree;
    window.matchMedia = function () {
      return list;
    };
    try {
      tree = new VanillaTree(root, { theme: 'auto' });
      equal(has(tree.tree, 'vtree-dark'), true, 'auto dark');
      list.matches = false;
      listeners[0]();
      equal(has(tree.tree, 'vtree-dark'), false, 'auto light');
      tree.destroy();
      equal(listeners.length, 0, 'listener removed');
    } finally {
      window.matchMedia = original;
    }
  });

  test('destroy', function () {
    var tree = fresh({ contextmenu: [{ label: 'x', action: function () {} }] });
    tree.destroy();
    equal(root.getElementsByTagName('ul').length, 0, 'tree removed');
  });

  var passed = 0;
  var failed = [];
  var i;
  for (i = 0; i < cases.length; i++) {
    try {
      cases[i].fn();
      passed++;
    } catch (error) {
      failed.push(cases[i].name + ': ' + (error.message || error));
    }
  }
  root.innerHTML = '';
  window.legacyResult = { passed: passed, failed: failed };
  var report = document.getElementById('legacy-report');
  if (report) {
    report.textContent = failed.length ? failed.length + ' failed:\n' + failed.join('\n') : passed + ' cases pass';
  }
})();
