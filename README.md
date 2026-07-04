# Web Attack Payload Reference

An educational reference of common web application vulnerabilities (XSS, SQL injection, command injection). Each entry explains how the attack works, why it works, and which control and framework address it.

[Live demo](https://payload-generator-one.vercel.app)

![Payload reference with filters](docs/hero.png)

## Why this project exists

I built this to understand the technical risks I will have to assess as an analyst: what these common web vulnerabilities look like, what they put at risk, and which control mitigates each one. It is a learning tool, not an attack tool.

## Use case

A GRC analyst or auditor preparing to review the security controls of a web application needs to understand common vulnerabilities in order to assess whether the right controls exist and work. This tool maps each vulnerability class to its risk, its OWASP category, and a mitigating control, so a non specialist can connect a technical finding to governance.

## Risk perspective

Each payload is a reference for a class of vulnerability. For every class the tool shows:

- What it is and why it works, in plain language
- The typical impact (confidentiality, integrity, availability)
- The mapped OWASP Top 10 category
- A related control (NIST 800-53, ISO 27001 Annex A, OWASP ASVS)
- A short mitigation note

## Features

- Reference of common payloads (XSS, SQLi, command injection)
- Filter by category, context, tag, and framework, with live match counts
- Explain panel: summary, why it works, when to use, mapped control, mitigation
- Extra utilities: Base64, URL encode, hashing, JSON, HTTP header analyzer

## How to use

1. Open the Payload reference.
2. Filter by category, context, tag, or framework.
3. Open any card and read the explanation and the control mapping.

## Tech stack

Next.js, React, TypeScript, Tailwind CSS. No external state library.
Filtering and counting logic is unit tested.

## Run locally

npm install
npm run dev
# http://localhost:3000

## Limitations

- Educational reference only. It does not run, send, or automate anything.
- The payloads are basic, well known teaching examples, not an exhaustive list.
- Control mappings are a learning aid. Always confirm against the official
  framework source before using them in real assessment work.

## Disclaimer

For learning and authorized testing only. Only test systems you own or have written permission to test. This project does not execute any payload.

## License

MIT
