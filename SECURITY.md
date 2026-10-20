# Security Policy

## Reporting

Use GitHub's private vulnerability reporting on this repository: [Report a vulnerability](https://github.com/finom/vanillatree/security/advisories/new). Do not open a public issue. Include the version and a minimal page that reproduces it.

## Scope

In scope: code in this repository that turns data into DOM, for example a label, a placeholder or a context menu item written as HTML where the docs say text, or a leaf id that reaches `Object.prototype`.

Out of scope: a label or a context menu item added with `html: true`, which is written as HTML by design. Escaping untrusted data before it gets there is the application's job.

## What you can expect

- Labels, the placeholder and context menu items are written with `textContent` unless `html: true` is set.
- Leaf ids are stored in tables made with `Object.create(null)` and found by id, not by a selector, so an id such as `__proto__` or `a"]` is a plain id.
- The library runs no code from strings (no `eval`, no `new Function`), so it works under a Content Security Policy without `unsafe-eval`.
- No runtime dependencies.

## Verifying a release

From 1.0.0 on, every version is published from GitHub Actions through npm trusted publishing, with an npm provenance attestation signed through Sigstore. In a project that installs it, `npm audit signatures` checks the registry signature and the attestation. Each GitHub Release carries the same attestation (`v<version>.intoto.jsonl`).

## Handling a report

1. The maintainer acknowledges the report within 14 days.
2. The maintainer reproduces it and agrees on the impact with the reporter in the private advisory.
3. The fix gets a regression test that fails on the code before it, and ships as a patch release of the latest version, within 60 days for a confirmed vulnerability.
4. The advisory is published with the release, with a CVE when one applies, and the CHANGELOG entry links it.

Reporters are credited in the advisory and the CHANGELOG entry, unless they ask not to be.

## Terms

Fixes ship in the latest version, with no backports. The software is provided **as is**, without warranty of any kind, per the [MIT license](./LICENSE).
