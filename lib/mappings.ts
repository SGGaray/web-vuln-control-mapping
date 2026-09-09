import type { PayloadCategory } from "@/lib/payloads";

export type MappingRelationship =
  | "classification"
  | "direct"
  | "strong"
  | "supporting";

export type MappingContentKey =
  | "classification"
  | "inputValidation"
  | "injectionPrevention"
  | "secureCoding";

export type ControlMapping = {
  framework: "OWASP Top 10" | "NIST SP 800-53" | "ISO/IEC 27001";
  version: "2021" | "Rev. 5" | "2022";
  controlId: string;
  title: string;
  relationship: MappingRelationship;
  contentKey: MappingContentKey;
  source: {
    label: string;
    url: string;
    provenance: "Official publisher";
  };
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

const controlMappings: readonly ControlMapping[] = [
  {
    framework: "OWASP Top 10",
    version: "2021",
    controlId: "A03:2021",
    title: "Injection",
    relationship: "classification",
    contentKey: "classification",
    source: sources.owasp,
  },
  {
    framework: "NIST SP 800-53",
    version: "Rev. 5",
    controlId: "SI-10",
    title: "Information Input Validation",
    relationship: "strong",
    contentKey: "inputValidation",
    source: sources.nist,
  },
  {
    framework: "NIST SP 800-53",
    version: "Rev. 5",
    controlId: "SI-10(6)",
    title: "Injection Prevention",
    relationship: "direct",
    contentKey: "injectionPrevention",
    source: sources.nist,
  },
  {
    framework: "ISO/IEC 27001",
    version: "2022",
    controlId: "A.8.28",
    title: "Secure coding",
    relationship: "supporting",
    contentKey: "secureCoding",
    source: sources.iso,
  },
];

export function getMappingBundle(category: PayloadCategory): MappingBundle {
  return {
    weaknessFamily: category,
    mappings: controlMappings,
    implementationEvidence: "Not evaluated",
    effectivenessEvidence: "Not evaluated",
  };
}
