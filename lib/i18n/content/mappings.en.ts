import type { MappingContentCatalog } from "./types";

export const mappingContentEn = {
  rationales: {
    XSS: {
      classification: "XSS is included in A03:2021 because untrusted data can be interpreted as active browser content.",
      inputValidation: "SI-10 strongly relates to validating external input before it crosses a trust boundary; XSS also requires encoding or sanitization for the eventual output context.",
      injectionPrevention: "SI-10(6) directly addresses preventing untrusted input from being interpreted as commands or code, including active browser content.",
      secureCoding: "A.8.28 supports secure design and implementation practices such as context-aware output encoding and avoiding unsafe browser sinks.",
    },
    "SQL Injection": {
      classification: "SQL Injection is included in A03:2021 because input can change the syntax or meaning of a database query.",
      inputValidation: "SI-10 strongly relates to checking external input, while parameterized queries provide the primary separation between SQL data and syntax.",
      injectionPrevention: "SI-10(6) directly addresses preventing untrusted input from being interpreted as database commands.",
      secureCoding: "A.8.28 supports secure coding practices such as parameterized queries, least privilege, and safe error handling.",
    },
    "Command Injection": {
      classification: "OS Command Injection is included in A03:2021 because input can alter commands passed to an operating-system interpreter.",
      inputValidation: "SI-10 strongly relates to checking external input, while avoiding shell invocation and using fixed argument arrays provide the primary boundary.",
      injectionPrevention: "SI-10(6) directly addresses preventing untrusted input from being interpreted as operating-system commands.",
      secureCoding: "A.8.28 supports secure coding practices such as non-shell process APIs, allowlisted arguments, and least privilege.",
    },
  },
  limitations: {
    classification: "OWASP Top 10 is a risk-awareness classification, not a control catalogue or proof that a vulnerability exists.",
    inputValidation: "Input validation alone does not prevent every injection path; the interpreter boundary and output context still need their specific safeguards.",
    injectionPrevention: "A direct conceptual relationship does not show that the enhancement is implemented, tested, or effective in a particular system.",
    secureCoding: "A.8.28 is broader than injection prevention and does not establish a specific technical safeguard without organization-specific implementation and evidence.",
  },
} satisfies MappingContentCatalog;

