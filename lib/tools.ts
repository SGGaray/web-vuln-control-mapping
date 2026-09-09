import type { ComponentType } from "react";
import type { TranslationKey } from "@/lib/i18n";
import {
  Binary,
  Link2,
  Hash,
  Braces,
  ListTree,
  Terminal,
  Bug,
  type LucideIcon,
} from "lucide-react";

import Base64Tool from "@/components/tools/Base64Tool";
import UrlTool from "@/components/tools/UrlTool";
import HashTool from "@/components/tools/HashTool";
import JsonTool from "@/components/tools/JsonTool";
import HeaderAnalyzer from "@/components/tools/HeaderAnalyzer";
import CommandGenerator from "@/components/tools/CommandGenerator";
import PayloadGenerator from "@/components/tools/PayloadGenerator";

export interface Tool {
  id: string;
  nameKey: TranslationKey;
  category: ToolCategory;
  icon: LucideIcon;
  component: ComponentType;
}

export type ToolCategory = "Recon" | "Encoding" | "Crypto" | "Data";

export const categoryTranslationKeys: Record<ToolCategory, TranslationKey> = {
  Recon: "navigation.categories.recon",
  Encoding: "navigation.categories.encoding",
  Crypto: "navigation.categories.crypto",
  Data: "navigation.categories.data",
};

/**
 * A tool definition. This registry is the ONLY place the app needs to know
 * about a tool. To add a new one: build a component, then add an entry here.
 * The sidebar and the main view both read from this list, so everything else
 * updates automatically. That is the "scalable, easy to add tools" design.
 */
export const tools: Tool[] = [
  {
    id: "payloads",
    nameKey: "navigation.payloads",
    category: "Recon",
    icon: Bug,
    component: PayloadGenerator,
  },
  {
    id: "base64",
    nameKey: "navigation.base64",
    category: "Encoding",
    icon: Binary,
    component: Base64Tool,
  },
  {
    id: "url",
    nameKey: "navigation.url",
    category: "Encoding",
    icon: Link2,
    component: UrlTool,
  },
  {
    id: "hash",
    nameKey: "navigation.hash",
    category: "Crypto",
    icon: Hash,
    component: HashTool,
  },
  {
    id: "json",
    nameKey: "navigation.json",
    category: "Data",
    icon: Braces,
    component: JsonTool,
  },
  {
    id: "headers",
    nameKey: "navigation.headers",
    category: "Recon",
    icon: ListTree,
    component: HeaderAnalyzer,
  },
  {
    id: "commands",
    nameKey: "navigation.commands",
    category: "Recon",
    icon: Terminal,
    component: CommandGenerator,
  },
];

/** Look up a tool by id. Falls back to the first tool if the id is unknown. */
export function getTool(id: string | null): Tool {
  return tools.find((t) => t.id === id) ?? tools[0];
}

/** Unique category names in the order they first appear. */
export function categories(): ToolCategory[] {
  return [...new Set(tools.map((t) => t.category))];
}
