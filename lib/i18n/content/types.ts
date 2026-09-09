import type { MappingContentKey } from "@/lib/mappings";
import type { PayloadCategory, PayloadId } from "@/lib/payloads";

export type PayloadContent = {
  description: string;
  summary: string;
  why: string;
  when: string;
  mitigation: string;
  preconditions?: string;
  signal?: string;
  limitations: string;
};

export type PayloadContentCatalog = Record<PayloadId, PayloadContent>;

export type MappingContentCatalog = {
  rationales: Record<
    PayloadCategory,
    Record<MappingContentKey, string>
  >;
  limitations: Record<MappingContentKey, string>;
};

export type MappingContent = {
  rationale: string;
  limitation: string;
};

