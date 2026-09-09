import { describe, expect, it } from "vitest";
import {
  buildCurlArgv,
  buildNmapArgv,
  isCurlHeaderFileSyntax,
  serializePosixArgv,
  type CurlOptions,
} from "./commands";

const curlDefaults: CurlOptions = {
  url: "https://example.com",
  method: "GET",
  header: "",
  body: "",
  follow: true,
  insecure: false,
  verbose: false,
};

describe("command argv builders", () => {
  it.each(["; id", "$(id)", "`id`", "a'b", "line 1\nline 2", "\\tmp", "café", "[::1]", "-oN/tmp/out"])(
    "keeps hostile or unusual curl input in one literal argv item: %s",
    (value) => {
      const argv = buildCurlArgv({ ...curlDefaults, url: value });
      expect(argv.slice(-2)).toEqual(["--url", value]);
      expect(serializePosixArgv(argv)).toContain(serializePosixArgv([value]));
    }
  );

  it("keeps a leading-hyphen nmap target after the option terminator", () => {
    const argv = buildNmapArgv({
      target: "-oN/tmp/result",
      scan: "-sS",
      ports: "custom",
      customPorts: "22, 80",
      timing: "T4",
      serviceVersion: true,
      skipDiscovery: false,
    });
    expect(argv.slice(-2)).toEqual(["--", "-oN/tmp/result"]);
    expect(argv).toContain("22, 80");
  });

  it("keeps GET selected when a body is present", () => {
    expect(buildCurlArgv({ ...curlDefaults, body: "{}" })).toEqual([
      "curl",
      "--request",
      "GET",
      "--location",
      "--data-raw",
      "{}",
      "--url",
      "https://example.com",
    ]);
  });

  it("keeps POST selected", () => {
    const argv = buildCurlArgv({ ...curlDefaults, method: "POST", body: "body" });
    expect(argv.slice(0, 3)).toEqual(["curl", "--request", "POST"]);
  });

  it("preserves a header as one literal argument", () => {
    const header = 'X-Test: "quoted"; $(id) | `id` & done';
    const argv = buildCurlArgv({ ...curlDefaults, header });
    expect(argv.slice(argv.indexOf("--header"), argv.indexOf("--header") + 2)).toEqual([
      "--header",
      header,
    ]);
  });

  it.each(["@filename", "@/tmp/file", "@-", "@/dev/stdin"])(
    "rejects curl header-file syntax: %s",
    (header) => {
      expect(isCurlHeaderFileSyntax(header)).toBe(true);
      expect(() => buildCurlArgv({ ...curlDefaults, header })).toThrow(
        /header-file syntax/i
      );
    }
  );

  it.each([
    "Authorization: Bearer TOKEN",
    "X-Test: value",
    "Header: value with spaces",
    'Header: "quoted"',
    "Header: $()",
    "Header: ;",
    "X-Unicode: acción 🚀",
    "X-Lines: one\ntwo",
  ])("keeps an ordinary literal header valid: %s", (header) => {
    expect(isCurlHeaderFileSyntax(header)).toBe(false);
    const argv = buildCurlArgv({ ...curlDefaults, header });
    expect(argv[argv.indexOf("--header") + 1]).toBe(header);
  });

  it("uses data-raw so @file remains literal and preserves whitespace", () => {
    const body = "  @secrets.txt\n";
    const argv = buildCurlArgv({ ...curlDefaults, method: "POST", body });
    expect(argv).toContain("--data-raw");
    expect(argv[argv.indexOf("--data-raw") + 1]).toBe(body);
  });

  it("uses curl HEAD semantics", () => {
    const argv = buildCurlArgv({ ...curlDefaults, method: "HEAD" });
    expect(argv).toContain("--head");
    expect(argv.slice(argv.indexOf("--request"), argv.indexOf("--request") + 2)).toEqual([
      "--request",
      "HEAD",
    ]);
  });

  it("round-trips every argument through a real POSIX shell", async () => {
    const original = [
      "plain",
      "; printf MARKER",
      "a'b",
      'double " quote',
      "line 1\nline 2",
      "tab\tvalue",
      "$(id)",
      "`id`",
      "pipe | ampersand &",
      "back\\slash",
      "café",
      "[::1]",
      "",
    ];
    const command = `printf '%s\\000' ${serializePosixArgv(original)}`;
    const { spawnSync } = await import("node:child_process");
    const result = spawnSync("/bin/sh", ["-c", command], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout.split("\0").slice(0, -1)).toEqual(original);
  });
});
