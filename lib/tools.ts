import type { ComponentType } from "react";
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

/**
 * A tool definition. This registry is the ONLY place the app needs to know
 * about a tool. To add a new one: build a component, then add an entry here.
 * The sidebar and the main view both read from this list, so everything else
 * updates automatically. That is the "scalable, easy to add tools" design.
 */
export type Tool = {
  id: string; // stable key, also used in the URL hash
  name: string; // label in the sidebar
  blurb: string; // one line description
  category: string; // used to group items in the sidebar
  icon: LucideIcon;
  component: ComponentType;
};

export const tools: Tool[] = [
  {
    id: "base64",
    name: "Base64",
    blurb: "Encode and decode Base64.",
    category: "Encoding",
    icon: Binary,
    component: Base64Tool,
  },
  {
    id: "url",
    name: "URL Encode",
    blurb: "Percent encode and decode.",
    category: "Encoding",
    icon: Link2,
    component: UrlTool,
  },
  {
    id: "hash",
    name: "Hash",
    blurb: "MD5, SHA1, SHA256 digests.",
    category: "Crypto",
    icon: Hash,
    component: HashTool,
  },
  {
    id: "json",
    name: "JSON",
    blurb: "Format and validate JSON.",
    category: "Data",
    icon: Braces,
    component: JsonTool,
  },
  {
    id: "headers",
    name: "Headers",
    blurb: "Analyze HTTP response headers.",
    category: "Recon",
    icon: ListTree,
    component: HeaderAnalyzer,
  },
  {
    id: "commands",
    name: "Commands",
    blurb: "Generate nmap and curl commands.",
    category: "Recon",
    icon: Terminal,
    component: CommandGenerator,
  },
  {
    id: "payloads",
    name: "Payloads",
    blurb: "Reference payloads with explanations and tags.",
    category: "Recon",
    icon: Bug,
    component: PayloadGenerator,
  },
];

/** Look up a tool by id. Falls back to the first tool if the id is unknown. */
export function getTool(id: string | null): Tool {
  return tools.find((t) => t.id === id) ?? tools[0];
}

/** Unique category names in the order they first appear. */
export function categories(): string[] {
  return [...new Set(tools.map((t) => t.category))];
}
