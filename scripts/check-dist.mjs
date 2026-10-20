// After `npm run build`: packs the package, installs the tarball into a temporary project and checks it the way a user
// loads it: require, import, the stylesheet export, the script tag, AMD, a CDN module, and the types.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';

const fail = (message) => {
  console.error(`check-dist: ${message}`);
  process.exit(1);
};
const check = (condition, message) => condition || fail(message);

const project = realpathSync(mkdtempSync(path.join(tmpdir(), 'vanillatree-check-dist-')));
process.on('exit', () => rmSync(project, { recursive: true, force: true }));
const npm = (...args) =>
  execFileSync('npm', args, { cwd: project, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
const tarball = path.join(project, npm('pack', process.cwd(), '--silent', '--ignore-scripts').trim());
writeFileSync(path.join(project, 'package.json'), '{ "private": true }');
npm('install', tarball, '--offline', '--no-audit', '--no-fund', '--ignore-scripts', '--silent');

const packaged = (file) => path.join(project, 'node_modules', 'vanillatree', file);
const files = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8' }).trim().split('\n').sort();
const expected = [
  'CHANGELOG.md',
  'LICENSE',
  'README.md',
  'dist/vanillatree.css',
  'dist/vanillatree.d.cts',
  'dist/vanillatree.d.mts',
  'dist/vanillatree.min.js',
  'dist/vanillatree.min.mjs',
  'package.json'
].map((file) => `package/${file}`);
check(JSON.stringify(files) === JSON.stringify(expected), `the tarball holds ${files.join(', ')}`);
const manifest = JSON.parse(readFileSync(packaged('package.json'), 'utf8'));
check(!manifest.dependencies && !manifest.peerDependencies, 'the package has dependencies');

// the entry and the stylesheet resolve; deep paths don't
const require = createRequire(path.join(project, 'index.js'));
check(require.resolve('vanillatree') === packaged('dist/vanillatree.min.js'), 'require resolves the UMD bundle');
check(require.resolve('vanillatree/vanillatree.css') === packaged('dist/vanillatree.css'), 'the stylesheet export');
for (const deep of ['vanillatree/dist/vanillatree.min.js', 'vanillatree/src/vanillatree.ts']) {
  let refused = false;
  try {
    require.resolve(deep);
  } catch (error) {
    refused = error.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
  }
  check(refused, `${deep} resolves`);
}

// no DOM: loading on a server or in a test runner without one doesn't throw
const required = require('vanillatree');
check(typeof required === 'function' && required.name === 'VanillaTree', 'require gives the class');
const imported = await import(pathToFileURL(path.join(project, 'node_modules/vanillatree/dist/vanillatree.min.mjs')));
check(typeof imported.default === 'function' && imported.VanillaTree === imported.default, 'import: default and named');
// Node resolves `import` to the ES module
writeFileSync(path.join(project, 'entry.mjs'), "export { default } from 'vanillatree';");
const { default: resolved } = await import(pathToFileURL(path.join(project, 'entry.mjs')));
check(resolved === imported.default, 'import resolves the ES module');

const run = (VanillaTree, window, label) => {
  const tree = new VanillaTree(window.document.getElementById('tree'), { placeholder: 'empty' });
  tree.add({ label: 'A', id: 'a' }).add({ label: 'B', id: 'b', parent: 'a' }).select('b');
  const leaf = window.document.querySelector('.vtree-selected');
  check(leaf?.getAttribute('data-vtree-id') === 'b', `${label}: a tree in a page`);
  check(tree.getPath('b').join('/') === 'a/b', `${label}: getPath`);
};

// the script tag, CommonJS and AMD from the same file
const page = () => new JSDOM('<div id="tree"></div>', { runScripts: 'outside-only', url: 'http://localhost/' }).window;
const umd = readFileSync(packaged('dist/vanillatree.min.js'), 'utf8');
{
  const window = page();
  window.eval(umd);
  run(window.VanillaTree, window, 'script tag');
}
{
  const window = page();
  window.eval(`var define = function (factory) { window.amd = factory(); }; define.amd = {};\n${umd}`);
  check(typeof window.amd === 'function' && !window.VanillaTree, 'AMD gets the class, no global');
  run(window.amd, window, 'AMD');
}

// the ES module in a page
{
  const window = page();
  // as in a page: Node has a CustomEvent of its own, which jsdom refuses
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.CustomEvent = window.CustomEvent;
  run(imported.default, window, 'ES module');
  run(required, window, 'require');
}

// the types, as a user's ES module and CommonJS file see them with the module resolutions a project uses today
copyFileSync(path.resolve('test/types/consumer.mts'), path.join(project, 'consumer.mts'));
copyFileSync(path.resolve('test/types/consumer.cts'), path.join(project, 'consumer.cts'));
for (const [module, moduleResolution, files] of [
  ['nodenext', 'nodenext', ['consumer.mts', 'consumer.cts']],
  ['esnext', 'bundler', ['consumer.mts']]
]) {
  const compilerOptions = {
    strict: true,
    module,
    moduleResolution,
    target: 'es2022',
    lib: ['es2023', 'dom'],
    types: [],
    noEmit: true
  };
  writeFileSync(path.join(project, 'tsconfig.json'), JSON.stringify({ compilerOptions, files }));
  try {
    execFileSync(path.resolve('node_modules/.bin/tsc'), ['-p', project], { encoding: 'utf8' });
  } catch (error) {
    fail(`types with ${moduleResolution} resolution:\n${error.stdout}${error.stderr}`);
  }
}

console.log(
  'check-dist: the packed tarball: require, import, the stylesheet, the script tag, AMD, the ES module and the types work; no dependencies'
);
