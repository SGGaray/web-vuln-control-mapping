/**
 * Explanation content for payloads, kept separate from the payload data and
 * from the UI. Each entry is plain data (no JSX), joined to a payload by its
 * id. The goal is to make a payload understandable in seconds, so every field
 * is deliberately short and conceptual. Nothing here is a step by step exploit
 * recipe: "why it works" describes the underlying flaw at a high level, and
 * "when to use it" frames the check for authorized testing.
 */

export type PayloadExplanation = {
  summary: string; // one or two lines, the gist
  why: string; // high level reason the class of flaw exists
  when: string; // practical context for an authorized test
};

export const explanations: Record<string, PayloadExplanation> = {
  /* ------------------------------ XSS ------------------------------ */
  "xss-script-basic": {
    summary: "A script tag that shows a harmless alert box if it executes.",
    why: "When an app places input into the page without escaping it, the browser parses that input as markup and runs any script inside it.",
    when: "A first, quick check on a reflected field to see if output is escaped. The alert is only a visible signal.",
  },
  "xss-img-onerror": {
    summary: "A broken image that runs its error handler.",
    why: "Even when literal script tags are removed, HTML event handlers still run code, so a failed image load can trigger script.",
    when: "Use when a plain script tag is stripped, to see if event handler attributes are filtered too.",
  },
  "xss-svg-onload": {
    summary: "An SVG element that runs code as soon as it loads.",
    why: "SVG is active markup whose load handler fires on its own, so no user interaction is needed for it to run.",
    when: "Useful where image tags are blocked, including values that get reflected from a cookie.",
  },
  "xss-url-encoded": {
    summary: "The script test with its angle brackets percent encoded.",
    why: "A filter may check the raw request while the server decodes it later, so encoded characters can slip past and then become real markup.",
    when: "Use to probe whether a filter validates input before or after decoding.",
  },
  "xss-html-entity": {
    summary: "The script test written with HTML entities.",
    why: "If an app turns entities back into characters when rendering, an inert looking value can become live markup on output.",
    when: "Use to test whether entity decoding happens at output, a common stored issue source.",
  },
  "xss-unicode-escape": {
    summary: "The script test written with JavaScript unicode escapes.",
    why: "In a JSON or script string context, an app that unescapes input can rebuild the characters that form a tag.",
    when: "Use when your input lands inside a script or JSON body rather than plain HTML.",
  },
  "xss-mixed-case": {
    summary: "The word script written in mixed case.",
    why: "A blocklist matching only the exact lowercase keyword misses variants, while browsers treat tag names case insensitively.",
    when: "Use to test whether a filter's keyword matching is case sensitive.",
  },
  "xss-fromcharcode": {
    summary: "Builds the alert text from character codes, not a literal word.",
    why: "Filters that look for specific literal strings do not see a keyword assembled at runtime.",
    when: "Use to check whether filtering depends on spotting literal keywords.",
  },
  "xss-var-split": {
    summary: "Calls the alert through an intermediate variable.",
    why: "A pattern match for a direct call can miss the same call reached indirectly.",
    when: "Use against filters that only match obvious, direct call patterns.",
  },

  /* -------------------------- SQL Injection -------------------------- */
  "sqli-single-quote": {
    summary: "A single quote on its own, the smallest possible probe.",
    why: "A quote can break out of a string in a query built by concatenation, and the resulting error shows input reaches the query.",
    when: "Always try this first. An error or odd behavior means the field is worth deeper, authorized testing.",
  },
  "sqli-or-1-1": {
    summary: "An always true condition, the textbook login bypass demo.",
    why: "If input is concatenated into a WHERE clause, an always true condition can make the clause pass regardless of the real values.",
    when: "Use on login or lookup fields to show a query trusts input. For teaching and authorized tests only.",
  },
  "sqli-or-comment": {
    summary: "An always true condition followed by a comment marker.",
    why: "The comment marker makes the database ignore the rest of the original query, leaving only the injected condition.",
    when: "Use when trailing query parts, like a password check, need to be neutralized to show impact.",
  },
  "sqli-admin-comment": {
    summary: "Ends a username early and comments out what follows.",
    why: "Closing the username value and commenting the remainder can make the query skip a following password condition.",
    when: "Use against login forms to illustrate authentication logic that trusts input.",
  },
  "sqli-double-quote": {
    summary: "The always true test using double quotes.",
    why: "Some queries wrap values in double quotes, so a matching quote is needed to break out of the string.",
    when: "Use when a single quote does nothing, to learn which quoting style the backend uses.",
  },
  "sqli-union-null": {
    summary: "A UNION that selects a single placeholder column.",
    why: "UNION appends a second query's result, and matching the column count is the first structural step to understand a query.",
    when: "Use conceptually to learn how many columns a query returns during an authorized assessment.",
  },
  "sqli-time-sleep": {
    summary: "Asks the database to pause, revealing injection by timing.",
    why: "When a page shows no data or error, a deliberate delay that changes response time still confirms input reaches the database.",
    when: "Use for blind cases where output gives nothing away. Sent through a header field here.",
  },

  /* ------------------------ Command Injection ------------------------ */
  "cmd-semicolon-id": {
    summary: "Chains a harmless id command after a semicolon.",
    why: "If input is passed to a shell, a separator lets a second command run after the intended one. id only prints the user.",
    when: "Use to check whether a parameter is handed to a shell. The command is read only.",
  },
  "cmd-and-whoami": {
    summary: "Runs whoami only if the first command succeeds.",
    why: "The AND separator chains commands conditionally, so a benign follow up confirms the shell parsed your input.",
    when: "Use as a safe confirmation that command separators are honored.",
  },
  "cmd-pipe-whoami": {
    summary: "Pipes output into a second, harmless command.",
    why: "A pipe passes one command's output to another, so seeing its result shows the pipe was interpreted.",
    when: "Use to test whether pipe characters pass through input handling.",
  },
  "cmd-subshell": {
    summary: "Runs id inside a command substitution.",
    why: "Substitution executes an inner command and inserts its output, so a benign inner command proves input reached a shell.",
    when: "Use where input may be embedded in a larger command string, such as a request body.",
  },
  "cmd-backtick": {
    summary: "The older backtick form of command substitution.",
    why: "Backticks do the same substitution as the modern form, so both are worth trying since a filter may block only one.",
    when: "Use alongside the parenthesis form to cover legacy shell syntax.",
  },
  "cmd-sleep": {
    summary: "A short, harmless delay for blind detection.",
    why: "When there is no visible output, a measurable pause still confirms the command ran.",
    when: "Use for blind command cases, mirroring the timing idea from SQL testing.",
  },
  "cmd-win-amp": {
    summary: "The Windows separator running a harmless whoami.",
    why: "On Windows shells the ampersand chains commands, so it is the separator to try when a target is not Unix based.",
    when: "Use against Windows or cmd.exe style targets where Unix separators may not apply.",
  },
};
