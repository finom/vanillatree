# Contributing

## Setup

Node 24 or newer.

```sh
npm ci
```

## Before a pull request

The same gate CI runs:

```sh
npm run lint && npm run typecheck && npm run test:coverage && npm run build && npm run check:dist
```

A fix or a feature comes with a test; a fix's test fails on the code before it. Coverage stays at 100% (the thresholds in `vitest.config.mjs` fail the gate below it).

## Coding style

TypeScript in `strict` mode, formatted and linted by [Biome](https://biomejs.dev) with its recommended rules (`biome.json`). A lint warning fails the gate (`npx biome check --write .` fixes most of them).

## Layout

- `src/vanillatree.ts` and `src/vanillatree.css`: the package. `npm run build` writes `dist/`: `vanillatree.min.js` (ES5 UMD for a script tag, CommonJS and AMD), `vanillatree.min.mjs` (ES module), the types and the stylesheet.
- `test/`: the tests (Vitest, jsdom), the property tests in `test/properties.test.ts`, and `test/legacy/scenario.js`.
- `demo/`: the page at [finom.github.io/vanillatree](https://finom.github.io/vanillatree/). `npm run build && npm run build:demo` writes it to `_site/`.

The script-tag bundle runs in Internet Explorer 10 and 11. `npm run check:dist` checks that it is ES5, runs `test/legacy/scenario.js` in a page without the APIs IE 10 lacks, runs the whole suite on the bundle, and installs the packed tarball to check `require`, `import`, the stylesheet export and the types. Open `test/legacy/index.html` over http to run the scenario in a real browser.

## Changelog and releases

Every change worth a line goes under `## [Unreleased]` in `CHANGELOG.md`. `npm run patch|minor|major` (or `beta`, `beta-minor`, `beta-major`) runs the gate, turns `[Unreleased]` into the version's section, commits, and pushes the `v<version>` tag. The tag publishes to npm from GitHub Actions, with provenance, and makes the GitHub Release from that section. `npm run patch -- --dry-run` runs everything but the commit.

## Sign-off

By sending a pull request you certify the [Developer Certificate of Origin 1.1](https://developercertificate.org): you wrote the change, or have the right to submit it, under the project's MIT license. Sign your commits off with `git commit -s`.

## Security

Do not open an issue for a vulnerability. See [SECURITY.md](./SECURITY.md).
