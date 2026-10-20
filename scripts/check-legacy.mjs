// After `npm run build`: dist/vanillatree.min.js is ES5 and reads no global or static member IE 10 lacks, except where
// the code checks for it first: each such name has a count below, and a new use fails until it is checked and counted.
// check-legacy-run.mjs catches prototype methods.
import { readFileSync } from 'node:fs';
import { parse } from 'acorn';
import { ancestor, full } from 'acorn-walk';

const file = 'dist/vanillatree.min.js';
const fail = (message) => {
  console.error(`check-legacy: ${message}`);
  process.exit(1);
};

const source = readFileSync(file, 'utf8');
let ast;
try {
  ast = parse(source, { ecmaVersion: 5, sourceType: 'script', locations: true });
} catch (error) {
  fail(`${file} is not ES5: ${error.message}`);
}

// a Babel helper means the source used something that needs one; the bundle stays without them
for (const helper of ['_classCallCheck', '_createForOfIteratorHelper', '_toConsumableArray', '_defineProperty']) {
  if (source.includes(helper)) fail(`${file} has the Babel helper ${helper}`);
}

// the globals and static members IE 10 lacks, and how often the bundle reads each one behind a check
const guarded = {
  globalThis: 2, // rollup's UMD wrapper: typeof globalThis, then globalThis
  CustomEvent: 2 // typeof CustomEvent, then new CustomEvent; createEvent otherwise
};
const missingGlobals = [
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
  'CustomEvent',
  'MutationObserver',
  'IntersectionObserver',
  'ResizeObserver',
  'fetch'
];
const missingStatics = {
  Object: [
    'assign',
    'is',
    'values',
    'entries',
    'fromEntries',
    'hasOwn',
    'getOwnPropertyDescriptors',
    'getOwnPropertySymbols',
    'setPrototypeOf'
  ],
  Array: ['from', 'of'],
  Number: ['isNaN', 'isInteger', 'isFinite', 'isSafeInteger', 'parseFloat', 'parseInt', 'EPSILON'],
  Math: ['trunc', 'sign', 'log10', 'log2', 'hypot', 'cbrt', 'expm1', 'fround', 'imul', 'clz32'],
  String: ['raw', 'fromCodePoint']
};

const declared = new Set();
full(ast, (node) => {
  if (node.type === 'VariableDeclarator') declared.add(node.id.name);
  if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
    if (node.id) declared.add(node.id.name);
    for (const param of node.params) declared.add(param.name);
  }
  if (node.type === 'CatchClause' && node.param) declared.add(node.param.name);
});
const found = Object.create(null);
const note = (name, node) => {
  found[name] ??= [];
  found[name].push(node.loc.start.column);
};
ancestor(ast, {
  MemberExpression(node) {
    if (node.computed || node.object.type !== 'Identifier' || declared.has(node.object.name)) return;
    if (
      Object.hasOwn(missingStatics, node.object.name) &&
      missingStatics[node.object.name].includes(node.property.name)
    ) {
      note(`${node.object.name}.${node.property.name}`, node);
    }
  },
  Identifier(node, _state, ancestors) {
    const parent = ancestors[ancestors.length - 2];
    const isName =
      (parent.type === 'MemberExpression' && parent.property === node && !parent.computed) ||
      (parent.type === 'Property' && parent.key === node && !parent.computed);
    if (!isName && missingGlobals.includes(node.name) && !declared.has(node.name)) note(node.name, node);
  }
});
const problems = [];
for (const name of Object.keys(found)) {
  if (found[name].length !== guarded[name]) {
    problems.push(`reads ${name} ${found[name].length} times, ${guarded[name] ?? 0} expected`);
  }
}
for (const name of Object.keys(guarded)) {
  if (!found[name]) problems.push(`no longer reads ${name}: update the count`);
}
if (problems.length) fail(`${file} ${problems.join('; ')}`);
console.log(`check-legacy: ${file} is ES5 and reads what IE 10 lacks only behind a check`);
