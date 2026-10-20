// npm run build: src/vanillatree.ts → dist/
//   vanillatree.min.js   ES5 UMD for a script tag, CommonJS and AMD (global `VanillaTree`), IE 10 and up
//   vanillatree.min.mjs  ES module for browsers that run modules and for bundlers
//   vanillatree.d.mts, vanillatree.d.cts  the types for import and require
//   vanillatree.css
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { transformSync } from '@babel/core';
import terser from '@rollup/plugin-terser';
import { rollup } from 'rollup';

const fail = (message) => {
  console.error(`build: ${message}`);
  process.exit(1);
};

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
const out = mkdtempSync(join(tmpdir(), 'vanillatree-build-'));
process.on('exit', () => rmSync(out, { recursive: true, force: true }));
execFileSync('npx', ['tsc', '-p', 'tsconfig.build.json', '--outDir', out], { stdio: 'inherit' });

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const banner = `/*! VanillaTree v${version} | MIT | https://github.com/finom/vanillatree */`;

// the source avoids what needs a Babel helper, so the bundle stays small; check-legacy.mjs fails on a helper
const babel = (targets) => ({
  name: 'babel',
  transform: (code) =>
    transformSync(code, {
      babelrc: false,
      configFile: false,
      presets: [['@babel/preset-env', { targets, modules: false }]],
      assumptions: {
        iterableIsArray: true,
        noDocumentAll: true,
        pureGetters: true,
        noNewArrows: true,
        ignoreFunctionLength: true,
        ignoreToPrimitiveHint: true,
        setClassMethods: true,
        setPublicClassFields: true,
        noClassCalls: true,
        constantSuper: true
      }
    }).code
});

// VanillaTree.name stays, for stack traces and devtools
const keepName = { keep_classnames: /^VanillaTree$/, keep_fnames: /^VanillaTree$/ };

const entry = 'vanillatree-entry';
const virtual = (code) => ({
  name: 'entry',
  resolveId: (id) => (id === entry ? id : null),
  load: (id) => (id === entry ? code : null)
});
const source = join(out, 'vanillatree.js').split('\\').join('/');

// the script-tag bundle: one value, the class
const umd = await rollup({ input: entry, plugins: [virtual(`export { default } from '${source}';`), babel('ie 10')] });
await umd.write({
  file: 'dist/vanillatree.min.js',
  format: 'umd',
  name: 'VanillaTree',
  exports: 'default',
  banner,
  plugins: [terser({ ...keepName, ecma: 5, safari10: true, compress: { passes: 3 }, format: { comments: /^!/ } })]
});
await umd.close();

const esm = await rollup({ input: source, plugins: [babel({ esmodules: true })] });
await esm.write({
  file: 'dist/vanillatree.min.mjs',
  format: 'es',
  banner,
  plugins: [terser({ ...keepName, ecma: 2015, module: true, compress: { passes: 3 }, format: { comments: /^!/ } })]
});
await esm.close();

// the types: as tsc writes them for import, and as `export =` for require
const types = readFileSync(join(out, 'vanillatree.d.ts'), 'utf8');
writeFileSync('dist/vanillatree.d.mts', types);
const names = [...types.matchAll(/^export (?:interface|type) (\w+)/gm)].map((match) => match[1]);
if (!types.includes('export default class VanillaTree {') || !types.includes('export { VanillaTree };')) {
  fail('the declarations changed shape; update the .d.cts step');
}
const cjs = types
  .replace('export default class VanillaTree {', 'declare class VanillaTree {')
  .replace('export { VanillaTree };', '')
  .replace(/^export (interface|type) /gm, '$1 ')
  .trimEnd();
writeFileSync(
  'dist/vanillatree.d.cts',
  `${cjs}
${names.map((name) => `type _${name} = ${name};`).join('\n')}
declare namespace VanillaTree {
${names.map((name) => `  export type ${name} = _${name};`).join('\n')}
}
export = VanillaTree;
`
);

copyFileSync('src/vanillatree.css', 'dist/vanillatree.css');
