// npm run build:demo (after npm run build): the GitHub Pages site in _site/, the demo with the built bundle and
// stylesheet next to it.
import { cpSync, rmSync } from 'node:fs';

rmSync('_site', { recursive: true, force: true });
cpSync('demo', '_site', { recursive: true });
for (const file of ['vanillatree.min.js', 'vanillatree.min.mjs', 'vanillatree.css']) {
  cpSync(`dist/${file}`, `_site/${file}`);
}
