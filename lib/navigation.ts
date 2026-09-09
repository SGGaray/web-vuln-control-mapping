import { getTool, tools } from "./tools";

export const defaultToolId = tools[0].id;

/** Empty and unknown hashes both fall back deterministically to the default tool. */
export function resolveToolIdFromHash(hash: string): string {
  const id = hash.startsWith("#") ? hash.slice(1) : hash;
  return id === "" ? defaultToolId : getTool(id).id;
}

export function toolHash(id: string): string {
  return `#${getTool(id).id}`;
}

type HashEventSource = Pick<Window, "location" | "addEventListener" | "removeEventListener">;

export function subscribeToToolHash(
  source: HashEventSource,
  onTool: (id: string) => void
): () => void {
  const sync = () => onTool(resolveToolIdFromHash(source.location.hash));
  sync();
  source.addEventListener("hashchange", sync);
  return () => source.removeEventListener("hashchange", sync);
}

export function navigateToTool(source: Pick<Window, "location">, id: string): void {
  source.location.hash = toolHash(id);
}
