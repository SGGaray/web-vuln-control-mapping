import type { Locale } from "@/lib/i18n/types";
import type { MappingContentKey } from "@/lib/mappings";
import type { PayloadCategory, PayloadId } from "@/lib/payloads";
import { mappingContentEn } from "./mappings.en";
import { mappingContentEsAR } from "./mappings.es-AR";
import { payloadContentEn } from "./payloads.en";
import { payloadContentEsAR } from "./payloads.es-AR";
import type { MappingContent, MappingContentCatalog, PayloadContent, PayloadContentCatalog } from "./types";

const payloadCatalogs: Record<Locale, PayloadContentCatalog> = {
  "es-AR": payloadContentEsAR,
  en: payloadContentEn,
};

const mappingCatalogs: Record<Locale, MappingContentCatalog> = {
  "es-AR": mappingContentEsAR,
  en: mappingContentEn,
};

export function getPayloadContent(locale: Locale, id: PayloadId): PayloadContent {
  return payloadCatalogs[locale][id];
}

export function getMappingContent(
  locale: Locale,
  category: PayloadCategory,
  key: MappingContentKey
): MappingContent {
  const catalog = mappingCatalogs[locale];
  return {
    rationale: catalog.rationales[category][key],
    limitation: catalog.limitations[key],
  };
}

export function payloadContentIds(locale: Locale): PayloadId[] {
  return Object.keys(payloadCatalogs[locale]) as PayloadId[];
}

