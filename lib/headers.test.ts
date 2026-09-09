import { describe, expect, it } from "vitest";
import { analyzeHeaderInput, parseHttpResponses } from "./headers";

function status(raw: string, header: string) {
  return analyzeHeaderInput(raw).assessments.find((item) => item.header === header)?.status;
}

describe("HTTP response parser", () => {
  it("parses LF and CRLF header-only input and preserves duplicates", () => {
    const result = parseHttpResponses("Set-Cookie: a=1\r\nSet-Cookie: b=2\r\nX-Test: a:b");
    expect(result.responses[0].headers).toEqual([
      { name: "Set-Cookie", value: "a=1" },
      { name: "Set-Cookie", value: "b=2" },
      { name: "X-Test", value: "a:b" },
    ]);
  });

  it("ignores body lines even when they look like headers", () => {
    const result = analyzeHeaderInput("HTTP/1.1 200 OK\nContent-Type: text/plain\n\nContent-Security-Policy: default-src 'none'");
    expect(result.selectedResponse?.headers).toHaveLength(1);
    expect(status("HTTP/1.1 200 OK\nContent-Type: text/plain\n\nContent-Security-Policy: default-src 'none'", "Content-Security-Policy")).toBe("not-evaluated");
  });

  it("ignores an ordinary response body", () => {
    const result = analyzeHeaderInput(
      "HTTP/1.1 200 OK\nContent-Type: text/plain\nX-Test: real\n\nordinary body"
    );
    expect(result.responses).toHaveLength(1);
    expect(result.selectedResponse?.headers).toEqual([
      { name: "Content-Type", value: "text/plain" },
      { name: "X-Test", value: "real" },
    ]);
  });

  it("does not promote a status line from the response body", () => {
    const result = analyzeHeaderInput(
      "HTTP/1.1 200 OK\nContent-Type: text/plain\n\nHTTP/1.1 200 OK\nX-Frame-Options: DENY"
    );
    expect(result.responses).toHaveLength(1);
    expect(result.selectedResponse?.headers).toEqual([
      { name: "Content-Type", value: "text/plain" },
    ]);
  });

  it("does not let a body status line replace header-only evidence", () => {
    const result = analyzeHeaderInput(
      "Content-Type: text/plain\nX-Test: real\n\nHTTP/1.1 200 OK\nX-Frame-Options: DENY"
    );
    expect(result.responses).toHaveLength(1);
    expect(result.selectedResponse?.statusLine).toBeUndefined();
    expect(result.selectedResponse?.headers).toEqual([
      { name: "Content-Type", value: "text/plain" },
      { name: "X-Test", value: "real" },
    ]);
    expect(status(
      "Content-Type: text/plain\nX-Test: real\n\nHTTP/1.1 200 OK\nX-Frame-Options: DENY",
      "X-Frame-Options"
    )).toBe("not-evaluated");
  });

  it.each(["\n", "\r\n"])(
    "does not promote the Astra fixture from a body using %j line endings",
    (newline) => {
      const body = [
        "HTTP/1.1 200 OK",
        "Content-Security-Policy: default-src 'none'",
        "X-Frame-Options: DENY",
        "",
      ].join(newline);
      const raw = [
        "HTTP/1.1 200 OK",
        "Content-Type: text/html",
        `Content-Length: ${body.length}`,
        "",
        body,
      ].join(newline);
      const result = analyzeHeaderInput(raw);

      expect(result.responses).toHaveLength(1);
      expect(result.selectedResponse?.headers.map((header) => header.name)).toEqual([
        "Content-Type",
        "Content-Length",
      ]);
      expect(status(raw, "Content-Security-Policy")).toBe("not-observed");
      expect(status(raw, "X-Frame-Options")).toBe("not-observed");
    }
  );

  it("does not manufacture evidence from incomplete body framing", () => {
    const result = analyzeHeaderInput(
      "HTTP/1.1 200 OK\nContent-Length: 200\n\npartial body\nHTTP/1.1 200 OK\nX-Content-Type-Options: nosniff"
    );
    expect(result.responses).toHaveLength(1);
    expect(status(
      "HTTP/1.1 200 OK\nContent-Length: 200\n\npartial body\nHTTP/1.1 200 OK\nX-Content-Type-Options: nosniff",
      "X-Content-Type-Options"
    )).toBe("not-observed");
  });

  it("preserves unambiguous concatenated responses after Content-Length zero", () => {
    const result = analyzeHeaderInput(
      "HTTP/1.1 200 OK\nContent-Length: 0\n\nHTTP/1.1 201 Created\nX-Test: final"
    );
    expect(result.responses).toHaveLength(2);
    expect(result.selectedResponse?.statusCode).toBe(201);
    expect(result.selectedResponse?.headers).toEqual([{ name: "X-Test", value: "final" }]);
  });

  it("does not treat a partially numeric Content-Length as bodyless framing", () => {
    const result = analyzeHeaderInput(
      "HTTP/1.1 200 OK\nContent-Length: 0junk\n\nHTTP/1.1 201 Created\nX-Test: false-evidence"
    );
    expect(result.responses).toHaveLength(1);
    expect(result.selectedResponse?.statusCode).toBe(200);
  });

  it("does not trust Content-Length zero when Transfer-Encoding is present", () => {
    const result = analyzeHeaderInput(
      "HTTP/1.1 200 OK\nTransfer-Encoding: chunked\nContent-Length: 0\n\nHTTP/1.1 201 Created\nX-Test: false-evidence"
    );
    expect(result.responses).toHaveLength(1);
    expect(result.selectedResponse?.statusCode).toBe(200);
  });

  it("does not guess that a redirect with unspecified body length is bodyless", () => {
    const result = analyzeHeaderInput(
      "HTTP/1.1 302 Found\nLocation: /final\n\nHTTP/1.1 200 OK\nX-Test: ambiguous"
    );
    expect(result.responses).toHaveLength(1);
    expect(result.selectedResponse?.statusCode).toBe(302);
  });

  it("selects the final non-interim response after redirects", () => {
    const result = analyzeHeaderInput(
      "HTTP/1.1 301 Moved\nContent-Security-Policy: default-src 'none'\nLocation: /final\nContent-Length: 0\n\nHTTP/1.1 200 OK\nX-Content-Type-Options: nosniff\n\nbody"
    );
    expect(result.responses).toHaveLength(2);
    expect(result.selectedResponse?.statusCode).toBe(200);
    expect(result.assessments.find((item) => item.header === "Content-Security-Policy")?.status).toBe("not-observed");
  });

  it("keeps valid header-only evidence and reports malformed lines", () => {
    const result = analyzeHeaderInput("X-Test: okay\nnot a header");
    expect(result.status).toBe("determined");
    expect(result.selectedResponse?.headers).toEqual([{ name: "X-Test", value: "okay" }]);
    expect(result.diagnostics).not.toHaveLength(0);
  });

  it("returns undetermined when nothing is parseable", () => {
    const result = analyzeHeaderInput("ordinary prose\nwithout fields");
    expect(result.status).toBe("undetermined");
    expect(result.assessments).toEqual([]);
  });
});

describe("limited security-header semantics", () => {
  it("classifies a strong-looking six-header fixture without claiming full assurance", () => {
    const result = analyzeHeaderInput(`HTTP/1.1 200 OK
Strict-Transport-Security: max-age=63072000; includeSubDomains
Content-Security-Policy: default-src 'self'; object-src 'none'; frame-ancestors 'none'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=()`);
    expect(result.assessments.map((item) => item.status)).toEqual([
      "observed",
      "observed",
      "observed",
      "observed",
      "observed",
      "not-evaluated",
    ]);
    expect(result.assessments.some((item) => /secure|protected/i.test(item.summary))).toBe(false);
  });

  it.each([
    ["Content-Security-Policy: ", "Content-Security-Policy"],
    ["Strict-Transport-Security: max-age=0", "Strict-Transport-Security"],
    ["X-Content-Type-Options: sniff", "X-Content-Type-Options"],
    ["X-Frame-Options: banana", "X-Frame-Options"],
    ["Referrer-Policy: unsafe-url", "Referrer-Policy"],
    ["Permissions-Policy: camera=*", "Permissions-Policy"],
  ])("marks a clearly weak value as invalid or ineffective: %s", (raw, header) => {
    expect(status(raw, header)).toBe("invalid-or-ineffective");
  });

  it("does not treat report-only CSP as enforced", () => {
    expect(status("Content-Security-Policy-Report-Only: default-src 'none'", "Content-Security-Policy")).toBe("not-evaluated");
  });

  it("does not claim a repeated CSP directive was fully evaluated", () => {
    expect(status("Content-Security-Policy: default-src 'self'; default-src 'none'", "Content-Security-Policy")).toBe("not-evaluated");
  });

  it("does not collapse duplicate CSP fields into one assurance claim", () => {
    expect(status(
      "Content-Security-Policy: default-src 'self'\nContent-Security-Policy: object-src 'none'",
      "Content-Security-Policy"
    )).toBe("not-evaluated");
  });

  it("recognizes frame-ancestors as an alternative to X-Frame-Options", () => {
    const result = analyzeHeaderInput("Content-Security-Policy: frame-ancestors 'none'");
    const frame = result.assessments.find((item) => item.header === "X-Frame-Options");
    expect(frame?.status).toBe("not-observed");
    expect(frame?.summary).toMatch(/alternative/i);
  });

  it("marks duplicate conflicting values", () => {
    expect(status("X-Frame-Options: DENY\nX-Frame-Options: SAMEORIGIN", "X-Frame-Options")).toBe("invalid-or-ineffective");
  });

  it("handles mixed casing in field names and recognized values", () => {
    expect(status("x-CoNtEnT-tYpE-oPtIoNs: NoSnIfF", "X-Content-Type-Options")).toBe("observed");
  });

  it.each([
    ["HTTP/1.1 204 No Content\nStrict-Transport-Security: max-age=10", 204],
    ["HTTP/1.1 500 Internal Server Error\nContent-Type: text/html", 500],
  ])("attributes headers to status %i", (raw, expectedStatus) => {
    expect(analyzeHeaderInput(raw).selectedResponse?.statusCode).toBe(expectedStatus);
  });

  it("does not evaluate document policies for a JSON response", () => {
    const result = analyzeHeaderInput("HTTP/1.1 200 OK\nContent-Type: application/json\nContent-Security-Policy: default-src 'none'");
    expect(result.assessments.find((item) => item.header === "Content-Security-Policy")?.status).toBe("not-evaluated");
    expect(result.assessments.find((item) => item.header === "X-Frame-Options")?.status).toBe("not-evaluated");
  });

  it("selects a final response after an interim response", () => {
    const result = analyzeHeaderInput("HTTP/1.1 100 Continue\nX-Test: interim\n\nHTTP/1.1 201 Created\nX-Test: final");
    expect(result.responses).toHaveLength(2);
    expect(result.selectedResponse?.statusCode).toBe(201);
  });

  it("diagnoses malformed field names in a full response", () => {
    const result = analyzeHeaderInput("HTTP/1.1 200 OK\nBad Field: value\nX-Test: valid");
    expect(result.selectedResponse?.headers).toEqual([{ name: "X-Test", value: "valid" }]);
    expect(result.diagnostics).toHaveLength(1);
  });

  it("treats empty input as undetermined", () => {
    expect(analyzeHeaderInput("").status).toBe("undetermined");
  });
});
