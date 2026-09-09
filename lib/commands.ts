export type NmapOptions = {
  target: string;
  scan: "-sS" | "-sT" | "-sU" | "-sn";
  ports: "top" | "all" | "custom";
  customPorts: string;
  timing: "T2" | "T3" | "T4" | "T5";
  serviceVersion: boolean;
  skipDiscovery: boolean;
};

export type CurlMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";

export type CurlOptions = {
  url: string;
  method: CurlMethod;
  header: string;
  body: string;
  follow: boolean;
  insecure: boolean;
  verbose: boolean;
};

/** Build argv first so user input can never merge with an option. */
export function buildNmapArgv(options: NmapOptions): string[] {
  const argv = ["nmap", options.scan];
  if (options.serviceVersion) argv.push("-sV");
  if (options.skipDiscovery) argv.push("-Pn");
  argv.push(`-${options.timing}`);

  if (options.ports === "all") argv.push("-p-");
  if (options.ports === "custom" && options.customPorts !== "") {
    argv.push("-p", options.customPorts);
  }

  // The option terminator keeps a target beginning with '-' as a target.
  argv.push("--", options.target || "<target>");
  return argv;
}

/**
 * Keep the selected HTTP method explicit. In particular, curl's data options
 * otherwise change GET to POST, and --data interprets values beginning with @
 * as filenames. --data-raw preserves the body as a literal argument.
 */
export function buildCurlArgv(options: CurlOptions): string[] {
  const argv = ["curl"];

  if (options.method === "HEAD") argv.push("--head");
  argv.push("--request", options.method);

  if (options.follow) argv.push("--location");
  if (options.insecure) argv.push("--insecure");
  if (options.verbose) argv.push("--verbose");
  if (options.header !== "") argv.push("--header", options.header);
  if (options.body !== "") argv.push("--data-raw", options.body);
  argv.push("--url", options.url || "https://example.com");

  return argv;
}

/** Serialize an argv vector for a POSIX shell without changing any argument. */
export function serializePosixArgv(argv: readonly string[]): string {
  return argv.map(quotePosixArgument).join(" ");
}

export function quotePosixArgument(value: string): string {
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(value) && value !== "") return value;
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}
