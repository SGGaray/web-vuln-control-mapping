export type HeaderEntry = { name: string; value: string };

export type HeaderDiagnostic = {
  level: "info" | "warning";
  message: string;
  line?: number;
};

export type ParsedHttpResponse = {
  statusLine?: string;
  statusCode?: number;
  headers: HeaderEntry[];
  diagnostics: HeaderDiagnostic[];
};

export type AssessmentStatus =
  | "observed"
  | "not-observed"
  | "invalid-or-ineffective"
  | "not-evaluated";

export type HeaderAssessment = {
  header: string;
  status: AssessmentStatus;
  summary: string;
};

export type HeaderAnalysis = {
  status: "determined" | "undetermined";
  responses: ParsedHttpResponse[];
  selectedResponseIndex: number | null;
  selectedResponse: ParsedHttpResponse | null;
  assessments: HeaderAssessment[];
  diagnostics: HeaderDiagnostic[];
};

const STATUS_LINE = /^HTTP\/\d(?:\.\d)?\s+(\d{3})(?:\s+.*)?$/i;
const FIELD_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

function parseHeaderLine(line: string): HeaderEntry | null {
  const colon = line.indexOf(":");
  if (colon <= 0) return null;
  const name = line.slice(0, colon).trim();
  if (!FIELD_NAME.test(name)) return null;
  return { name, value: line.slice(colon + 1).trim() };
}

/** Parse a header-only block or one/many complete HTTP responses. */
export function parseHttpResponses(raw: string): {
  responses: ParsedHttpResponse[];
  diagnostics: HeaderDiagnostic[];
} {
  const lines = raw.replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
  const hasStatusLine = lines.some((line) => STATUS_LINE.test(line.trim()));
  const diagnostics: HeaderDiagnostic[] = [];

  if (!hasStatusLine) {
    const response: ParsedHttpResponse = { headers: [], diagnostics: [] };
    let bodyStarted = false;

    lines.forEach((line, index) => {
      if (bodyStarted) return;
      if (line.trim() === "") {
        if (response.headers.length > 0) bodyStarted = true;
        return;
      }
      const header = parseHeaderLine(line);
      if (header) response.headers.push(header);
      else {
        response.diagnostics.push({
          level: "warning",
          line: index + 1,
          message: "Ignored a line that is not a valid HTTP header field.",
        });
      }
    });

    if (response.headers.length === 0) {
      diagnostics.push({
        level: "warning",
        message: "No parseable HTTP status line or header fields were found.",
      });
      return { responses: [], diagnostics: [...diagnostics, ...response.diagnostics] };
    }
    return { responses: [response], diagnostics: response.diagnostics };
  }

  const responses: ParsedHttpResponse[] = [];
  let current: ParsedHttpResponse | null = null;
  let inHeaders = false;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const statusMatch = trimmed.match(STATUS_LINE);
    if (statusMatch) {
      if (current) responses.push(current);
      current = {
        statusLine: trimmed,
        statusCode: Number(statusMatch[1]),
        headers: [],
        diagnostics: [],
      };
      inHeaders = true;
      return;
    }

    if (!current) {
      if (trimmed) {
        diagnostics.push({
          level: "warning",
          line: index + 1,
          message: "Ignored content before the first HTTP status line.",
        });
      }
      return;
    }
    if (!inHeaders) return;
    if (trimmed === "") {
      inHeaders = false;
      return;
    }

    const header = parseHeaderLine(line);
    if (header) current.headers.push(header);
    else {
      current.diagnostics.push({
        level: "warning",
        line: index + 1,
        message: "Ignored a malformed header line.",
      });
    }
  });

  if (current) responses.push(current);
  return {
    responses,
    diagnostics: [
      ...diagnostics,
      ...responses.flatMap((response) => response.diagnostics),
    ],
  };
}

function values(response: ParsedHttpResponse, name: string): string[] {
  const lower = name.toLowerCase();
  return response.headers
    .filter((header) => header.name.toLowerCase() === lower)
    .map((header) => header.value);
}

function assessCsp(response: ParsedHttpResponse): HeaderAssessment {
  const enforced = values(response, "content-security-policy");
  const reportOnly = values(response, "content-security-policy-report-only");
  if (enforced.length === 0) {
    return reportOnly.length > 0
      ? {
          header: "Content-Security-Policy",
          status: "not-evaluated",
          summary: "Only a report-only policy was observed; it does not enforce restrictions.",
        }
      : {
          header: "Content-Security-Policy",
          status: "not-observed",
          summary: "No enforced policy was observed in the selected response.",
        };
  }
  if (enforced.some((value) => value.trim() === "")) {
    return {
      header: "Content-Security-Policy",
      status: "invalid-or-ineffective",
      summary: "An empty enforced policy does not provide a meaningful restriction.",
    };
  }

  const tokens = enforced
    .flatMap((policy) => policy.toLowerCase().split(";").flatMap((directive) => directive.trim().split(/\s+/)))
    .filter(Boolean);
  const permissive = ["*", "data:", "'unsafe-inline'", "'unsafe-eval'"];
  if (tokens.some((token) => permissive.includes(token))) {
    return {
      header: "Content-Security-Policy",
      status: "invalid-or-ineffective",
      summary: "The policy contains a clearly permissive source or unsafe script keyword.",
    };
  }
  const duplicateDirective = enforced.some((policy) => {
    const names = policy
      .split(";")
      .map((directive) => directive.trim().split(/\s+/, 1)[0].toLowerCase())
      .filter(Boolean);
    return new Set(names).size !== names.length;
  });
  if (duplicateDirective) {
    return {
      header: "Content-Security-Policy",
      status: "not-evaluated",
      summary: "A directive is repeated; browser precedence and the effective policy were not fully evaluated.",
    };
  }
  return {
    header: "Content-Security-Policy",
    status: enforced.length > 1 ? "not-evaluated" : "observed",
    summary:
      enforced.length > 1
        ? "Multiple enforced policies were observed; their combined browser behavior was not fully evaluated."
        : "A non-empty enforced policy was observed; this limited check does not prove its full effectiveness.",
  };
}

function assessHsts(response: ParsedHttpResponse): HeaderAssessment {
  const entries = values(response, "strict-transport-security");
  if (entries.length === 0) {
    return { header: "Strict-Transport-Security", status: "not-observed", summary: "Not observed in the selected response." };
  }
  const maxAges = entries.map((entry) => entry.match(/(?:^|;)\s*max-age\s*=\s*(\d+)/i)?.[1]);
  if (entries.some((entry) => entry.trim() === "") || maxAges.some((age) => age === undefined || age === "0")) {
    return {
      header: "Strict-Transport-Security",
      status: "invalid-or-ineffective",
      summary: "The policy is empty, lacks a valid max-age, or explicitly disables HSTS with max-age=0.",
    };
  }
  return {
    header: "Strict-Transport-Security",
    status: "observed",
    summary: "A positive max-age was observed; HTTPS delivery and preload eligibility were not evaluated.",
  };
}

function assessExact(
  response: ParsedHttpResponse,
  header: string,
  accepted: readonly string[],
  observedSummary: string
): HeaderAssessment {
  const entries = values(response, header);
  if (entries.length === 0) return { header, status: "not-observed", summary: "Not observed in the selected response." };
  const normalized = entries.map((entry) => entry.trim().toLowerCase());
  if (normalized.every((entry) => accepted.includes(entry)) && new Set(normalized).size === 1) {
    return { header, status: "observed", summary: observedSummary };
  }
  return {
    header,
    status: "invalid-or-ineffective",
    summary: "The observed value is invalid, empty, or conflicts with another instance.",
  };
}

function assessReferrerPolicy(response: ParsedHttpResponse): HeaderAssessment {
  const entries = values(response, "referrer-policy");
  if (entries.length === 0) return { header: "Referrer-Policy", status: "not-observed", summary: "Not observed in the selected response." };
  const valid = new Set([
    "no-referrer", "no-referrer-when-downgrade", "origin", "origin-when-cross-origin",
    "same-origin", "strict-origin", "strict-origin-when-cross-origin", "unsafe-url",
  ]);
  const policies = entries.flatMap((entry) => entry.split(",").map((value) => value.trim().toLowerCase())).filter(Boolean);
  if (policies.length === 0 || policies.some((policy) => !valid.has(policy) || policy === "unsafe-url")) {
    return {
      header: "Referrer-Policy",
      status: "invalid-or-ineffective",
      summary: "The policy is empty, unknown, or uses unsafe-url, which sends the full referrer broadly.",
    };
  }
  return {
    header: "Referrer-Policy",
    status: "observed",
    summary: "A recognized policy was observed; suitability for the application was not evaluated.",
  };
}

function assessPermissionsPolicy(response: ParsedHttpResponse): HeaderAssessment {
  const entries = values(response, "permissions-policy");
  if (entries.length === 0) return { header: "Permissions-Policy", status: "not-observed", summary: "Not observed in the selected response." };
  if (
    entries.some(
      (entry) => entry.trim() === "" || !entry.includes("=") || /=\s*(?:\*|\(\s*\*\s*\))(?:\s*,|\s*$)/.test(entry)
    )
  ) {
    return {
      header: "Permissions-Policy",
      status: "invalid-or-ineffective",
      summary: "The policy is empty, malformed, or grants a feature to every origin with a wildcard.",
    };
  }
  return {
    header: "Permissions-Policy",
    status: "not-evaluated",
    summary: "A policy was observed; feature-specific allowlists and browser support were not fully evaluated.",
  };
}

export function analyzeHeaderInput(raw: string): HeaderAnalysis {
  const parsed = parseHttpResponses(raw);
  const selectedResponseIndex = (() => {
    for (let index = parsed.responses.length - 1; index >= 0; index -= 1) {
      const status = parsed.responses[index].statusCode;
      if (status === undefined || status < 100 || status >= 200) return index;
    }
    return parsed.responses.length > 0 ? parsed.responses.length - 1 : null;
  })();
  const selectedResponse = selectedResponseIndex === null ? null : parsed.responses[selectedResponseIndex];

  if (!selectedResponse) {
    return {
      status: "undetermined",
      responses: parsed.responses,
      selectedResponseIndex,
      selectedResponse,
      assessments: [],
      diagnostics: parsed.diagnostics,
    };
  }

  const csp = assessCsp(selectedResponse);
  const frameAncestors = values(selectedResponse, "content-security-policy").some((value) =>
    /(?:^|;)\s*frame-ancestors\s+/i.test(value)
  );
  const xFrame = assessExact(
    selectedResponse,
    "X-Frame-Options",
    ["deny", "sameorigin"],
    "A recognized framing restriction was observed."
  );
  const contentTypes = values(selectedResponse, "content-type").map((value) => value.toLowerCase());
  const clearlyNotDocument =
    selectedResponse.statusCode === 204 ||
    selectedResponse.statusCode === 304 ||
    contentTypes.some((value) =>
      /^(?:application\/json|text\/plain|image\/|audio\/|video\/)/.test(value.trim())
    );
  if (clearlyNotDocument) {
    csp.status = "not-evaluated";
    csp.summary = "The selected response is bodyless or clearly non-HTML, so document-policy effectiveness was not evaluated.";
    xFrame.status = "not-evaluated";
    xFrame.summary = "The selected response is bodyless or clearly non-HTML, so framing protection was not evaluated.";
  }
  if (xFrame.status === "not-observed" && frameAncestors) {
    xFrame.summary = "Not observed; CSP frame-ancestors is present as a modern alternative, but its effectiveness was not fully evaluated.";
  }

  return {
    status: "determined",
    responses: parsed.responses,
    selectedResponseIndex,
    selectedResponse,
    diagnostics: parsed.diagnostics,
    assessments: [
      assessHsts(selectedResponse),
      csp,
      xFrame,
      assessExact(
        selectedResponse,
        "X-Content-Type-Options",
        ["nosniff"],
        "The recognized nosniff value was observed."
      ),
      assessReferrerPolicy(selectedResponse),
      assessPermissionsPolicy(selectedResponse),
    ],
  };
}
