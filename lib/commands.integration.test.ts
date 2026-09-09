import { spawn } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildCurlArgv, serializePosixArgv, type CurlOptions } from "./commands";

type Observation = { method: string; body: string };

const observations: Observation[] = [];
let server: Server;
let localUrl: string;

function executeShell(command: string, environment: NodeJS.ProcessEnv = process.env): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("/bin/sh", ["-c", command], {
      env: environment,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.once("error", reject);
    child.once("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`Command exited ${code}: ${stderr}`))
    );
  });
}

function curlOptions(overrides: Partial<CurlOptions>): CurlOptions {
  return {
    url: localUrl,
    method: "GET",
    header: "",
    body: "",
    follow: false,
    insecure: false,
    verbose: false,
    ...overrides,
  };
}

async function executeCurl(overrides: Partial<CurlOptions>): Promise<Observation> {
  await executeShell(serializePosixArgv(buildCurlArgv(curlOptions(overrides))));
  const observation = observations.at(-1);
  if (!observation) throw new Error("Local echo server did not observe a request.");
  return observation;
}

beforeAll(async () => {
  server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      observations.push({
        method: request.method ?? "",
        body: Buffer.concat(chunks).toString("utf8"),
      });
      response.statusCode = 204;
      response.end();
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address() as AddressInfo;
  localUrl = `http://127.0.0.1:${address.port}/echo`;
});

beforeEach(() => {
  observations.length = 0;
});

afterAll(async () => {
  if (!server?.listening) return;
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
});

describe("independent curl semantics against localhost", () => {
  it("sends GET even when a body is present", async () => {
    expect(await executeCurl({ method: "GET", body: "get-body" })).toEqual({
      method: "GET",
      body: "get-body",
    });
  });

  it("sends POST", async () => {
    expect(await executeCurl({ method: "POST", body: "post-body" })).toEqual({
      method: "POST",
      body: "post-body",
    });
  });

  it("sends HEAD", async () => {
    expect(await executeCurl({ method: "HEAD" })).toEqual({ method: "HEAD", body: "" });
  });

  it("sends @filename literally instead of reading the file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "wvcm-curl-body-"));
    const path = join(directory, "synthetic.txt");
    try {
      await writeFile(path, "AUDIT_SYNTHETIC_FILE_ONLY", "utf8");
      const body = `@${path}`;
      expect(await executeCurl({ method: "POST", body })).toEqual({ method: "POST", body });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("preserves body spaces and newlines", async () => {
    const body = "  payload  \nline two\n";
    expect(await executeCurl({ method: "POST", body })).toEqual({ method: "POST", body });
  });

  it("passes header metacharacters and newline as one literal shell argument", async () => {
    const directory = await mkdtemp(join(tmpdir(), "wvcm-curl-stub-"));
    const stub = join(directory, "curl");
    const output = join(directory, "argv.bin");
    const header = "X-Audit: ' \" $() ` ;\ncontinued";
    try {
      await writeFile(stub, '#!/bin/sh\nprintf \'%s\\0\' "$@" > "$WVCM_ARGV_OUTPUT"\n', "utf8");
      await chmod(stub, 0o700);
      await executeShell(
        serializePosixArgv(buildCurlArgv(curlOptions({ header }))),
        {
          ...process.env,
          PATH: `${directory}:${process.env.PATH ?? ""}`,
          WVCM_ARGV_OUTPUT: output,
        }
      );
      const argv = (await readFile(output)).toString("utf8").split("\0").slice(0, -1);
      expect(argv[argv.indexOf("--header") + 1]).toBe(header);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
