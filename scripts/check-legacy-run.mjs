// After `npm run build`: runs test/legacy/scenario.js against dist/vanillatree.min.js in a jsdom page without the
// JavaScript and DOM APIs IE 10 lacks (removed below), so a call to one of them fails here as it fails there.
// MODERN=1 runs it with every API in place.
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const fail = (message) => {
  console.error(`check-legacy-run: ${message}`);
  process.exit(1);
};

// what IE 10 has not
function toIE10(window) {
  const drop = (object, names) => {
    for (const name of names) {
      if (!object || !(name in object)) continue;
      delete object[name];
      if (name in object) fail(`can't remove ${name}`);
    }
  };
  drop(window, [
    'Symbol',
    'Reflect',
    'Promise',
    'Proxy',
    'Map',
    'Set',
    'WeakMap',
    'WeakSet',
    'WeakRef',
    'globalThis',
    'queueMicrotask',
    'structuredClone',
    'MutationObserver',
    'IntersectionObserver',
    'ResizeObserver',
    'fetch',
    'HTMLTemplateElement'
  ]);
  // CustomEvent is an object there, not a constructor
  window.CustomEvent = {};
  drop(window.Object, [
    'assign',
    'is',
    'values',
    'entries',
    'fromEntries',
    'hasOwn',
    'getOwnPropertySymbols',
    'getOwnPropertyDescriptors',
    'setPrototypeOf'
  ]);
  // ES5's Object.keys: a primitive throws
  const { keys } = window.Object;
  window.Object.keys = (object) => {
    if (object === null || (typeof object !== 'object' && typeof object !== 'function')) {
      throw new window.TypeError('Object.keys: argument is not an Object');
    }
    return keys(object);
  };
  drop(window.Array, ['from', 'of']);
  drop(window.Array.prototype, [
    'includes',
    'find',
    'findIndex',
    'findLast',
    'findLastIndex',
    'fill',
    'copyWithin',
    'keys',
    'values',
    'entries',
    'flat',
    'flatMap',
    'at',
    'toSorted',
    'toReversed',
    'toSpliced',
    'with'
  ]);
  drop(window.String.prototype, [
    'includes',
    'startsWith',
    'endsWith',
    'repeat',
    'padStart',
    'padEnd',
    'replaceAll',
    'at',
    'trimStart',
    'trimEnd',
    'codePointAt',
    'normalize',
    'matchAll'
  ]);
  drop(window.Number, ['isNaN', 'isInteger', 'isFinite', 'isSafeInteger', 'parseFloat', 'parseInt']);
  drop(window.Math, ['trunc', 'sign', 'log10', 'log2', 'hypot', 'cbrt', 'expm1', 'fround', 'imul', 'clz32']);

  // the DOM: msMatchesSelector instead of matches, no closest/remove/append…, no dataset, no Event constructors,
  // contains only on elements, classList.add and remove take one class and toggle no second argument
  const { Element, Node, DOMTokenList, NodeList, HTMLElement } = window;
  Element.prototype.msMatchesSelector = Element.prototype.matches;
  drop(Element.prototype, [
    'matches',
    'closest',
    'remove',
    'append',
    'prepend',
    'before',
    'after',
    'replaceWith',
    'replaceChildren',
    'toggleAttribute',
    'getAttributeNames'
  ]);
  drop(HTMLElement.prototype, ['dataset']);
  drop(window.CharacterData.prototype, ['remove', 'before', 'after', 'replaceWith']);
  drop(window.Document.prototype, ['append', 'prepend']);
  drop(window.DocumentFragment.prototype, ['append', 'prepend', 'children', 'firstElementChild']);
  drop(Node.prototype, ['isConnected', 'getRootNode']);
  drop(NodeList.prototype, ['forEach', 'keys', 'values', 'entries']);
  const contains = Node.prototype.contains;
  drop(Node.prototype, ['contains']);
  Element.prototype.contains = contains;
  const { toggle, add, remove } = DOMTokenList.prototype;
  DOMTokenList.prototype.toggle = function (token) {
    return toggle.call(this, token);
  };
  DOMTokenList.prototype.add = function (token) {
    add.call(this, token);
  };
  DOMTokenList.prototype.remove = function (token) {
    remove.call(this, token);
  };
  for (const name of ['Event', 'MouseEvent', 'KeyboardEvent', 'FocusEvent', 'UIEvent']) {
    const Native = window[name];
    // biome-ignore lint/complexity/useArrowFunction: it has a prototype, as the constructor it replaces
    const notConstructor = function () {
      throw new window.TypeError("Object doesn't support this action");
    };
    notConstructor.prototype = Native.prototype;
    window[name] = notConstructor;
  }
}

const dom = new JSDOM('<!DOCTYPE html><body><pre id="legacy-report"></pre><div id="legacy-root"></div></body>', {
  url: 'http://localhost/',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  beforeParse: process.env.MODERN ? undefined : toIE10
});
const { window } = dom;
if (!process.env.MODERN) {
  for (const name of ['Symbol', 'Promise', 'Map']) {
    if (window.eval(`typeof ${name}`) !== 'undefined') fail(`${name} is still there`);
  }
  if (window.eval('typeof CustomEvent') === 'function') fail('CustomEvent is still a constructor');
}

window.eval(readFileSync('dist/vanillatree.min.js', 'utf8'));
window.eval(readFileSync('test/legacy/scenario.js', 'utf8'));

const result = window.legacyResult;
if (!result) fail('the scenario did not finish');
if (result.failed.length) fail(`${result.failed.length} failed:\n${result.failed.join('\n')}`);
console.log(
  `check-legacy-run: ${result.passed} cases pass ${process.env.MODERN ? 'with every API' : 'without the APIs IE 10 lacks'}`
);
window.close();
