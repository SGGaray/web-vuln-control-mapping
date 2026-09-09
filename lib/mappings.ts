import type { PayloadCategory } from "@/lib/payloads";

export type MappingRelationship =
  | "classification"
  | "direct"
  | "strong"
  | "supporting";

export type ControlMapping = {
  framework: "OWASP Top 10" | "NIST SP 800-53" | "ISO/IEC 27001";
  version: "2021" | "Rev. 5" | "2022";
  controlId: string;
  title: string;
  relationship: MappingRelationship;
  rationale: string;
  source: {
    label: string;
    url: string;
    provenance: "Official publisher";
  };
  limitation: string;
};

export type MappingBundle = {
  weaknessFamily: PayloadCategory;
  mappings: readonly ControlMapping[];
  implementationEvidence: "Not evaluated";
  effectivenessEvidence: "Not evaluated";
};

const sources = {
  owasp: {
    label: "OWASP Top 10: A03:2021 — Injection",
    url: "https://owasp.org/Top10/A03_2021-Injection/",
    provenance: "Official publisher" as const,
  },
  nist: {
    label: "NIST SP 800-53 Rev. 5, including Update 1",
    url: "https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final",
    provenance: "Official publisher" as const,
  },
  iso: {
    label: "ISO/IEC 27001:2022",
    url: "https://www.iso.org/standard/27001",
    provenance: "Official publisher" as const,
  },
} satisfies Record<string, ControlMapping["source"]>;

const familyRationale: Record<
  PayloadCategory,
  { classification: string; inputValidation: string; injectionPrevention: string; secureCoding: string }
> = {
  XSS: {
    classification:
      "XSS is included in A03:2021 because untrusted data can be interpreted as active browser content.",
    inputValidation:
      "SI-10 strongly relates to validating external input before it crosses a trust boundary; XSS also requires encoding or sanitization for the eventual output context.",
    injectionPrevention:
      "SI-10(6) directly addresses preventing untrusted input from being interpreted as commands or code, including active browser content.",
    secureCoding:
      "A.8.28 supports secure design and implementation practices such as context-aware output encoding and avoiding unsafe browser sinks.",
  },
  "SQL Injection": {
    classification:
      "SQL injection is included in A03:2021 because input can change the syntax or meaning of a database query.",
    inputValidation:
      "SI-10 strongly relates to checking external input, while parameterized queries provide the primary separation between SQL data and syntax.",
    injectionPrevention:
      "SI-10(6) directly addresses preventing untrusted input from being interpreted as database commands.",
    secureCoding:
      "A.8.28 supports secure coding practices such as parameterized queries, least privilege, and safe error handling.",
  },
  "Command Injection": {
    classification:
      "OS command injection is included in A03:2021 because input can alter commands passed to an operating-system interpreter.",
    inputValidation:
      "SI-10 strongly relates to checking external input, while avoiding shell invocation and using fixed argument arrays provide the primary boundary.",
    injectionPrevention:
      "SI-10(6) directly addresses preventing untrusted input from being interpreted as operating-system commands.",
    secureCoding:
      "A.8.28 supports secure coding practices such as non-shell process APIs, allowlisted arguments, and least privilege.",
  },
};

function mappingsFor(category: PayloadCategory): readonly ControlMapping[] {
  const rationale = familyRationale[category];

  return [
    {
      framework: "OWASP Top 10",
      version: "2021",
      controlId: "A03:2021",
      title: "Injection",
      relationship: "classification",
      rationale: rationale.classification,
      source: sources.owasp,
      limitation:
        "OWASP Top 10 is a risk-awareness classification, not a control catalogue or proof that a vulnerability exists.",
    },
    {
      framework: "NIST SP 800-53",
      version: "Rev. 5",
      controlId: "SI-10",
      title: "Information Input Validation",
      relationship: "strong",
      rationale: rationale.inputValidation,
      source: sources.nist,
      limitation:
        "Input validation alone does not prevent every injection path; the interpreter boundary and output context still need their specific safeguards.",
    },
    {
      framework: "NIST SP 800-53",
      version: "Rev. 5",
      controlId: "SI-10(6)",
      title: "Injection Prevention",
      relationship: "direct",
      rationale: rationale.injectionPrevention,
      source: sources.nist,
      limitation:
        "A direct conceptual relationship does not show that the enhancement is implemented, tested, or effective in a particular system.",
    },
    {
      framework: "ISO/IEC 27001",
      version: "2022",
      controlId: "A.8.28",
      title: "Secure coding",
      relationship: "supporting",
      rationale: rationale.secureCoding,
      source: sources.iso,
      limitation:
        "A.8.28 is broader than injection prevention and does not establish a specific technical safeguard without organization-specific implementation and evidence.",
    },
  ];
}

export const mappingsByWeaknessFamily: Record<
  PayloadCategory,
  readonly ControlMapping[]
> = {
  XSS: mappingsFor("XSS"),
  "SQL Injection": mappingsFor("SQL Injection"),
  "Command Injection": mappingsFor("Command Injection"),
};

export function getMappingBundle(category: PayloadCategory): MappingBundle {
  return {
    weaknessFamily: category,
    mappings: mappingsByWeaknessFamily[category],
    implementationEvidence: "Not evaluated",
    effectivenessEvidence: "Not evaluated",
  };
}
