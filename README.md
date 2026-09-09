# Web Vulnerability Control Mapping

An educational reference that connects basic XSS, SQL injection, and command
injection examples to defensive concepts and control-framework relationships.

[Live demo](https://web-vuln-control-mapping-mauve.vercel.app)

![Payload reference with filters](docs/hero.png)

## Why this project exists

The project helps students, analysts, and auditors connect a technical weakness
family to relevant security guidance. It is a learning aid for recognizing
concepts and preparing questions for an assessment; it does not assess a target.

## Payload Reference

The reference contains 23 static teaching strings across XSS, SQL injection,
and command injection. You can search them and filter by category, input
context, and tag. Each explanation separates the concept, preconditions,
observable signal, limitations, mitigation technique, and control mappings.

Mappings are made at the weakness-family level and identify their relationship:

- OWASP Top 10 2021 A03 Injection: classification
- NIST SP 800-53 Rev. 5 SI-10: strong relationship
- NIST SP 800-53 Rev. 5 SI-10(6): direct relationship
- ISO/IEC 27001:2022 A.8.28: supporting relationship

Each mapping includes its version, rationale, limitation, and an official source.

Tool navigation uses URL hashes. An empty or unknown hash opens Payload
Reference; a recognized hash opens that tool, and browser Back/Forward follows
the corresponding history entry.

## Interface languages

The interface defaults deterministically to Argentine Spanish (`es-AR`). The
ES/EN control changes presentation text without changing tool IDs, assessment
states, mapping relationships, generated commands, or other technical values.
A valid preference is stored locally under `wvcm-locale`; missing or invalid
values fall back to `es-AR`. The first server render stays deterministic and a
saved preference is restored after hydration without locale-specific routing.

The 23 payload records and their detailed teaching explanations remain in their
original English in this first localization phase. Technical names such as
Base64, JSON, HTTP, OWASP, NIST, and ISO/IEC also remain unchanged.

## Utility data flow

- Base64, URL encoding, JSON formatting, and Header Analyzer run entirely in the
  browser. Their input is not sent to an application API. Base64 operates on
  UTF-8 text, rejects invalid UTF-8 bytes, preserves a leading UTF-8 BOM, and
  ignores ASCII whitespace in encoded input.
- JSON Format and Minify preserve number and string lexemes, object order, and
  duplicate keys while changing only insignificant whitespace.
- Header Analyzer parses pasted HTTP response text locally. It does not request
  a URL or inspect a live server.
- Hash sends the entered text and selected algorithms in a `POST /api/hash`
  request to this application. The API uses Node.js cryptography and returns the
  requested digests. Input is bounded and is not stored by the application.
- Commands builds copyable nmap and curl strings in the browser. It targets
  POSIX-shell display syntax and never executes a command. Execution happens
  only if a user copies the string to a separate shell outside this application.

## What this tool does not prove

- The application does not perform active scanning or execute payloads.
- A displayed payload does not prove that a vulnerability exists.
- A changed response, error, or timing difference is a signal to corroborate,
  not confirmation of exploitability.
- The application does not verify exploitation or determine that a mitigation
  is effective in a target system.
- A control mapping does not prove that the control is implemented or effective.
- A mapping does not establish compliance with OWASP, NIST, ISO/IEC 27001, or
  any other framework.
- Every mapping requires review in the system's technical and governance context.
- A clean result from one example does not establish that other contexts, sinks,
  dialects, platforms, or application paths are safe.

## Tech stack

Next.js, React, TypeScript, and Tailwind CSS. Filtering, educational-content
invariants, control mappings, request boundaries, parsing, and serialization are
covered by unit tests.

## Run locally

Requires Node.js 22.

```sh
npm ci
npm run dev
```

Then open `http://localhost:3000`.

Before submitting a change, run:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

## Limitations

- The payloads are basic, well-known teaching examples and are not exhaustive.
- Explanations cannot account for every parser, framework, deployment, or
  compensating control.
- Confirm mappings against the linked official publications before using them
  in an assessment.

## Disclaimer

For learning and authorized testing only. Test only systems you own or have
written permission to test. This project does not execute any payload.

## License

MIT
