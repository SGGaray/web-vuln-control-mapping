# Web Vulnerability Control Mapping

[Español](README.md) | **English**

## What it is

WVCM is an educational reference that connects basic Cross-Site Scripting
(XSS), SQL Injection, and Command Injection examples with technical signals,
mitigations, and security-control relationships. It is intended for students,
analysts, and people preparing an authorized assessment.

## Demo

[Open the demo](https://wvcm.sggaray.com)

![Payload reference with filters](docs/hero.png)

## What you can do

- Explore static payloads and filter them by category, context, or tag.
- Review the conditions each example requires and the signal it might produce.
- Analyze HTTP response text and observe a limited set of security headers.
- Encode and decode Base64, URLs, and JSON with data-fidelity checks.
- Compute MD5, SHA-1, and SHA-256 hashes.
- Build nmap and curl commands to copy and run in your own lab.
- Consult conceptual mappings to OWASP Top 10, NIST SP 800-53, and ISO/IEC
  27001.

## Included tools

Payload Reference, Header Analyzer, Hash, Base64, URL, JSON, and Commands. The
interface is available in Argentine Spanish and English; the ES/EN selector
stores the preference in the browser.

## How evidence is interpreted

Header Analyzer states describe only what was observed in the pasted response.
A present header does not automatically mean that protection is effective, and
an absent header does not confirm a vulnerability.

A mapping indicates a relevant relationship, but does not show that the
control is implemented or effective, and does not determine compliance.
Signals must be compared, repeated, and corroborated in their actual technical
context.

## What it does not prove

WVCM:

- does not execute payloads;
- does not scan targets;
- does not confirm vulnerabilities or exploitation;
- does not determine control effectiveness;
- does not determine compliance;
- uses mappings as contextual support, not implementation evidence.

## Data flow

Payload Reference, Header Analyzer, Base64, URL, JSON, and command generation
run locally in the browser. Hash sends the text and selected algorithms to
`POST /api/hash`; input is bounded and the application does not store it.

## Local development

Requires Node.js 22.

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Validation

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

The automated suite covers parsing, API boundaries, command serialization,
mappings, data fidelity, navigation, and accessible interaction. The Next.js
build can run on Node.js 22 compatible hosting or on Vercel.

## Cloudflare Workers

WVCM deploys to Cloudflare Workers with the
[OpenNext](https://opennext.js.org/cloudflare) adapter. Configuration lives in
`wrangler.jsonc` and `open-next.config.ts`.

```sh
npm run preview
```

Builds the app for Workers and serves it locally on the Cloudflare runtime at
`http://localhost:8787`.

To deploy from Cloudflare Workers Builds:

- Build command: `npx opennextjs-cloudflare build`
- Deploy command: `npx opennextjs-cloudflare deploy`

`public/_headers` mirrors the `next.config.mjs` security headers for static
assets; if you change one, update the other.

## Authorized use

Use WVCM only on systems you own or have written permission to test. The
project is an educational aid and does not replace a professional assessment.

## License

MIT
