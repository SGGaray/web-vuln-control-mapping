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

## Deployment and dependency posture (reviewed 2026-11-25)

WVCM is a static export (`output: "export"`) published as Cloudflare Workers
Static Assets. There is no Worker script and no server-side application code:
every response is a file from `out/` plus the headers in `out/_headers`.
Server-side Next.js and React Server Components code is used only at build
time and is not deployed.

- **Shipped to browsers:** the client bundles built from `next`, `react`,
  `react-dom` and `lucide-react`. React and Next.js advisories that only
  affect server rendering, Server Actions or the image optimizer do not reach
  a deployed code path, but client-side advisories still apply. The site
  runs on Next.js 16, the Active LTS line (https://nextjs.org/support-policy).
- **Build, test and deploy tooling:** Next.js (build), Tailwind CSS, ESLint,
  Vitest and `wrangler`. They run in CI, in Cloudflare Workers Builds and on
  developer machines, and none of their code is published.

On this review `npm audit` and `npm audit --omit=dev` report 0
vulnerabilities, and OSV reports none for the lockfile. Packages vendored
inside `next` or bundled inside `wrangler` are not visible to these scanners;
their release notes should be reviewed when they are updated. Dependency advisories
are tracked through GitHub Dependabot alerts.
