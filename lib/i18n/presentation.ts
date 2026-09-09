import type { TranslationKey } from "./index";
import type { MappingRelationship } from "@/lib/mappings";
import type { PayloadContext } from "@/lib/payloads";

const headerSummaryKeys: Record<string, TranslationKey> = {
  "Not observed in the selected response.": "headers.summary.notObserved",
  "Only a report-only policy was observed; it does not enforce restrictions.": "headers.summary.cspReportOnly",
  "No enforced policy was observed in the selected response.": "headers.summary.cspMissing",
  "An empty enforced policy does not provide a meaningful restriction.": "headers.summary.cspEmpty",
  "The policy contains a clearly permissive source or unsafe script keyword.": "headers.summary.cspPermissive",
  "A directive is repeated; browser precedence and the effective policy were not fully evaluated.": "headers.summary.cspDuplicate",
  "Multiple enforced policies were observed; their combined browser behavior was not fully evaluated.": "headers.summary.cspMultiple",
  "A non-empty enforced policy was observed; this limited check does not prove its full effectiveness.": "headers.summary.cspObserved",
  "The policy is empty, lacks a valid max-age, or explicitly disables HSTS with max-age=0.": "headers.summary.hstsInvalid",
  "A positive max-age was observed; HTTPS delivery and preload eligibility were not evaluated.": "headers.summary.hstsObserved",
  "The observed value is invalid, empty, or conflicts with another instance.": "headers.summary.exactInvalid",
  "A recognized framing restriction was observed.": "headers.summary.frameObserved",
  "The recognized nosniff value was observed.": "headers.summary.nosniffObserved",
  "The policy is empty, unknown, or uses unsafe-url, which sends the full referrer broadly.": "headers.summary.referrerInvalid",
  "A recognized policy was observed; suitability for the application was not evaluated.": "headers.summary.referrerObserved",
  "The policy is empty, malformed, or grants a feature to every origin with a wildcard.": "headers.summary.permissionsInvalid",
  "A policy was observed; feature-specific allowlists and browser support were not fully evaluated.": "headers.summary.permissionsObserved",
  "The selected response is bodyless or clearly non-HTML, so document-policy effectiveness was not evaluated.": "headers.summary.nonDocumentCsp",
  "The selected response is bodyless or clearly non-HTML, so framing protection was not evaluated.": "headers.summary.nonDocumentFrame",
  "Not observed; CSP frame-ancestors is present as a modern alternative, but its effectiveness was not fully evaluated.": "headers.summary.frameAncestors",
};

const headerDiagnosticKeys: Record<string, TranslationKey> = {
  "Ignored a line that is not a valid HTTP header field.": "headers.diagnostic.invalidField",
  "No parseable HTTP status line or header fields were found.": "headers.diagnostic.noneFound",
  "Ignored content before the first HTTP status line.": "headers.diagnostic.beforeStatus",
  "Ignored a malformed header line.": "headers.diagnostic.malformed",
};

const payloadContextKeys: Record<PayloadContext, TranslationKey> = {
  "URL parameter": "payloads.context.urlParameter",
  "Form field": "payloads.context.formField",
  "HTTP header": "payloads.context.httpHeader",
  "Request body": "payloads.context.requestBody",
  Cookie: "payloads.context.cookie",
};

const relationshipKeys: Record<MappingRelationship, TranslationKey> = {
  classification: "mappings.relationship.classification",
  direct: "mappings.relationship.direct",
  strong: "mappings.relationship.strong",
  supporting: "mappings.relationship.supporting",
};

export function headerSummaryKey(summary: string): TranslationKey | undefined {
  return headerSummaryKeys[summary];
}

export function headerDiagnosticKey(message: string): TranslationKey | undefined {
  return headerDiagnosticKeys[message];
}

export function payloadContextKey(context: PayloadContext): TranslationKey {
  return payloadContextKeys[context];
}

export function relationshipKey(relationship: MappingRelationship): TranslationKey {
  return relationshipKeys[relationship];
}

