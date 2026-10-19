# Security Policy

## Reporting a vulnerability

Do not open a public issue for security-sensitive findings.

Report vulnerabilities privately at
[security@sggaray.com](mailto:security@sggaray.com).

Please include:

- The affected page, version, or commit.
- The minimum steps required to reproduce the issue.
- The observed security impact.
- Sanitized logs or screenshots when relevant.
- A proof of concept using synthetic data where possible.

Do not include credentials, tokens, personal data, or other sensitive
information in the report.

Ordinary bugs, documentation errors, and content corrections that do not
involve a security impact can still be reported through GitHub Issues.

This project does not currently operate a bug bounty program or guarantee a
fixed response time.

## Dependency posture (reviewed 2026-10-19)

After a compatible patch/minor refresh (no major upgrades), `npm audit`
reports 9 advisories (7 high, 2 moderate), down from 16 before the refresh.
`npm audit --omit=dev` reports 0, down from 6.

- **Production:** The Cloudflare Worker bundles `next` 15.5.28, `react`,
  `react-dom` 19.2.8, `styled-jsx` and `@swc/helpers`, verified against the
  OpenNext esbuild metafile, plus the OpenNext adapter's own runtime code.
  No open advisory affects them. Next.js was moved from 15.5.25 to 15.5.28
  for GHSA-4jqv-mc3x-m676 and GHSA-mcj8-r9mp-w47p (SSG/ISR cache
  poisoning). Neither applied here: the app uses only the App Router, has no
  Pages Router routes or root catch-all, nothing revalidates, and
  prerendered pages are served read-only from Workers static assets. The
  patch was applied anyway because it is a same-minor release. Next.js
  15.5.27 changed the format of its response cache keys, so
  `@opennextjs/cloudflare` was moved from 1.20.6 to 1.20.9, whose adapter
  (`@opennextjs/aws` 4.1.8) reads the new keys. Without that update the
  Worker re-rendered prerendered pages instead of serving them, and the
  re-rendered HTML no longer matched the build's CSP hashes. Releases
  1.20.10 to 1.20.12 were not taken because they add `glob` 10.3.3
  (GHSA-5j98-mcp5-4vw2, glob CLI command injection) to the build tooling.
- **Build and deploy tooling:** `wrangler` (4.138.0 to 4.151.2) and its
  `miniflare`, `undici` and `sharp` (0.35.5) dependencies were updated to
  patched versions, as was `source-map-js` (1.2.2), which Next.js uses
  through PostCSS at build time. `npm audit --omit=dev` counts them because
  `wrangler` is a peer of `@opennextjs/cloudflare` and `sharp` and `postcss`
  are dependencies of `next`, but they run only during build, local preview
  and deploy and are not part of the Worker bundle. No open advisory remains
  in this group.
- **Development only:** All 9 remaining advisories are in the Tailwind CSS 3
  toolchain (`tailwindcss` 3.4.19 through `chokidar`, `micromatch`,
  `fast-glob`, `braces`, `postcss-nested` and `postcss-selector-parser`) and
  in `eslint-config-next` through `@next/eslint-plugin-next` and `fast-glob`.
  The underlying issues are CPU or stack-exhaustion denial of service when
  parsing attacker-controlled glob patterns or CSS selectors. Here those
  tools only read this repository's own source files at build or lint time.
  `braces` 3.0.3 has no patched release. npm's only proposed fixes are
  Tailwind CSS 4 (a major migration) and `eslint-config-next` 14.2.35 (a
  downgrade out of step with Next.js 15), so both are deferred.

No open advisory identified in this review reaches an exploitable production
path in WVCM. Production dependency advisories are tracked through GitHub
Dependabot alerts.
