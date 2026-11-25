import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ALLOWED_ALGORITHMS,
  HashError,
  MAX_REQUESTED_ALGORITHMS,
  MAX_TEXT_LENGTH,
  computeHashes,
  normalizeAlgorithms,
  webCryptoDigest,
  type AllowedAlgorithm,
  type Digest,
} from "./hash-local";
import {
  editResultInput,
  initialResultState,
  rejectResult,
  resolveResult,
  startResult,
  type ResultState,
} from "./result-state";

// What the former POST /api/hash returned: node:crypto over the JS string,
// which Node encodes as UTF-8 (lone surrogates become U+FFFD).
function serverHashes(text: string, algorithms: readonly AllowedAlgorithm[] = ALLOWED_ALGORITHMS) {
  return Object.fromEntries(
    algorithms.map((algorithm) => [algorithm, createHash(algorithm).update(text).digest("hex")])
  );
}

// Deterministic xorshift32 stream, so a failing case is reproducible from its seed.
function xorshift(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  };
}

// Random UTF-16 text that mixes ASCII and control characters, 2- and 3-byte
// UTF-8 code points, valid surrogate pairs and lone surrogates of both kinds.
function randomUtf16(length: number, seed: number): string {
  const next = xorshift(seed);
  const units: number[] = [];
  while (units.length < length) {
    const kind = next() % 6;
    if (kind === 0) units.push(next() % 0x80);
    else if (kind === 1) units.push(0x80 + (next() % 0x780));
    else if (kind === 2) units.push(0x800 + (next() % (0xd800 - 0x800)));
    else if (kind === 3) units.push(0xe000 + (next() % 0x2000));
    else if (kind === 4) units.push(0xd800 + (next() % 0x400), 0xdc00 + (next() % 0x400));
    else units.push(0xd800 + (next() % 0x800));
  }
  return String.fromCharCode(...units.slice(0, length));
}

const corpus: [string, string][] = [
  ["empty", ""],
  ["ASCII", "hello"],
  ["ASCII sentence", "The quick brown fox jumps over the lazy dog"],
  ["accents", "áéíóú ñ ÁÉÍÓÚ Ñ ü ç"],
  ["decomposed accents (NFD is not normalized)", "a\u0301e\u0301"],
  ["CJK", "漢字かなカナ한국어"],
  ["right-to-left", "مرحبا שלום"],
  ["emoji with modifiers and ZWJ", "😀👍🏽👨‍👩‍👧‍👦🏳️‍🌈"],
  ["LF newlines", "line1\nline2\n"],
  ["CRLF newlines", "line1\r\nline2\r\n"],
  ["CR only", "line1\rline2"],
  ["tab and NUL", "a\tb\u0000c"],
  ["lone high surrogate", "a\uD800b"],
  ["lone low surrogate", "a\uDC00b"],
  ["reversed surrogate pair", "\uDC00\uD800"],
  ["trailing high surrogate", "x\uD83D"],
  ["BOM and noncharacter", "\uFEFFx\uFFFF"],
  ["MD5/SHA padding boundary, 55 bytes", "a".repeat(55)],
  ["MD5/SHA padding boundary, 56 bytes", "a".repeat(56)],
  ["MD5/SHA padding boundary, 64 bytes", "a".repeat(64)],
  ["maximum length, ASCII", "a".repeat(MAX_TEXT_LENGTH)],
  ["maximum length, 4-byte UTF-8", "😀".repeat(MAX_TEXT_LENGTH / 2)],
  ["maximum length, 3-byte UTF-8", "€".repeat(MAX_TEXT_LENGTH)],
  ["maximum length, lone surrogates", "\uD800".repeat(MAX_TEXT_LENGTH)],
];

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("computeHashes (local)", () => {
  // SHA-1 and SHA-256: FIPS 180 examples published by NIST CSRC.
  // MD5: RFC 1321 appendix A.5 (the full suite is in lib/md5.test.ts).
  it.each([
    ["", {
      md5: "d41d8cd98f00b204e9800998ecf8427e",
      sha1: "da39a3ee5e6b4b0d3255bfef95601890afd80709",
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    }],
    ["abc", {
      md5: "900150983cd24fb0d6963f7d28e17f72",
      sha1: "a9993e364706816aba3e25717850c26c9cd0d89d",
      sha256: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    }],
  ])("matches the published reference vectors for %j", async (input, expected) => {
    await expect(computeHashes(input, ALLOWED_ALGORITHMS)).resolves.toEqual(expected);
  });

  it("matches the FIPS 180 two-block example for SHA-1 and SHA-256", async () => {
    await expect(
      computeHashes("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq", ["sha1", "sha256"])
    ).resolves.toEqual({
      sha1: "84983e441c3bd26ebaae4aa1f95129e5e54670f1",
      sha256: "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    });
  });

  it("matches the FIPS 180 one-million-'a' digests through the same Web Crypto primitive", async () => {
    // One million characters is over MAX_TEXT_LENGTH, so this calls the
    // primitive computeHashes uses rather than computeHashes itself.
    const digest = webCryptoDigest();
    if (!digest) throw new Error("Web Crypto missing in the test runtime");
    const bytes = new TextEncoder().encode("a".repeat(1_000_000));
    const hex = async (name: "SHA-1" | "SHA-256") => Buffer.from(await digest(name, bytes)).toString("hex");
    expect(await hex("SHA-1")).toBe("34aa973cd4c4daa4f61eeb2bdbad27316534016f");
    expect(await hex("SHA-256")).toBe("cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0");
  });

  it.each(corpus)("returns what the server route returned for %s", async (_name, text) => {
    await expect(computeHashes(text, ALLOWED_ALGORITHMS)).resolves.toEqual(serverHashes(text));
  });

  it("matches node:crypto for 400 random UTF-16 strings, including lone surrogates", async () => {
    for (let seed = 1; seed <= 400; seed++) {
      const text = randomUtf16(seed <= 300 ? seed % 130 : 1000 + seed * 7, seed);
      expect(await computeHashes(text, ALLOWED_ALGORITHMS), `seed ${seed}`).toEqual(serverHashes(text));
    }
  });

  it("encodes lone surrogates as U+FFFD, like node:crypto", async () => {
    const replaced = await computeHashes("a\uFFFDb", ALLOWED_ALGORITHMS);
    await expect(computeHashes("a\uD800b", ALLOWED_ALGORITHMS)).resolves.toEqual(replaced);
    await expect(computeHashes("a\uDC00b", ALLOWED_ALGORITHMS)).resolves.toEqual(replaced);
  });

  it("accepts text exactly at the length limit and rejects one code unit more", async () => {
    await expect(computeHashes("a".repeat(MAX_TEXT_LENGTH), ["sha256"])).resolves.toHaveProperty("sha256");
    await expect(computeHashes("a".repeat(MAX_TEXT_LENGTH + 1), ["sha256"])).rejects.toMatchObject({
      code: "TEXT_TOO_LONG",
    });
    // The limit counts UTF-16 code units, as the server route did: 50,000
    // emoji are 100,000 code units, so one more character is over the limit.
    await expect(computeHashes("😀".repeat(MAX_TEXT_LENGTH / 2) + "a", ["md5"])).rejects.toMatchObject({
      code: "TEXT_TOO_LONG",
    });
  });

  it("rejects the limit before encoding or hashing anything", async () => {
    const digest = vi.fn<Digest>();
    const encode = vi.spyOn(TextEncoder.prototype, "encode");
    await expect(computeHashes("a".repeat(MAX_TEXT_LENGTH + 1), ALLOWED_ALGORITHMS, digest)).rejects.toThrow();
    expect(encode).not.toHaveBeenCalled();
    expect(digest).not.toHaveBeenCalled();
  });

  it.each([12345, undefined, null, true, { text: "x" }])("rejects a non-string input: %j", async (value) => {
    await expect(computeHashes(value as unknown as string, ["md5"])).rejects.toMatchObject({ code: "INVALID_TEXT" });
  });
});

describe("algorithm selection", () => {
  it("returns only the requested digests", async () => {
    await expect(computeHashes("hello", ["sha256"])).resolves.toEqual({
      sha256: "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    });
    await expect(computeHashes("hello", ["md5", "sha1"])).resolves.toEqual({
      md5: "5d41402abc4b2a76b9719d911017c592",
      sha1: "aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d",
    });
  });

  it("does not call Web Crypto for MD5 alone", async () => {
    const digest = vi.fn<Digest>();
    await expect(computeHashes("hello", ["md5"], digest)).resolves.toEqual({ md5: "5d41402abc4b2a76b9719d911017c592" });
    expect(digest).not.toHaveBeenCalled();
  });

  it("deduplicates algorithms before hashing", async () => {
    const digest = vi.fn<Digest>(async () => new Uint8Array([0xab]).buffer);
    await expect(computeHashes("hello", ["sha256", "sha256", "sha256"], digest)).resolves.toEqual({ sha256: "ab" });
    expect(digest).toHaveBeenCalledOnce();
  });

  it("never performs more work than the three supported algorithms", async () => {
    const digest = vi.fn<Digest>(async () => new ArrayBuffer(1));
    await computeHashes("hello", ALLOWED_ALGORITHMS, digest);
    expect(digest).toHaveBeenCalledTimes(2);
    expect(digest.mock.calls.map(([name]) => name).sort()).toEqual(["SHA-1", "SHA-256"]);
  });

  it.each([
    [["md6", "sha512"], "INVALID_ALGORITHM"],
    [["sha256", "unknown"], "INVALID_ALGORITHM"],
    [["SHA256"], "INVALID_ALGORITHM"],
    [[1], "INVALID_ALGORITHM"],
    [[], "NO_VALID_ALGORITHMS"],
    ["sha256", "INVALID_ALGORITHMS"],
    [null, "INVALID_ALGORITHMS"],
    [Array.from({ length: MAX_REQUESTED_ALGORITHMS + 1 }, () => "sha256"), "TOO_MANY_ALGORITHMS"],
  ])("rejects %j with %s", async (algorithms, code) => {
    expect(normalizeAlgorithms(algorithms)).toMatchObject({ ok: false, error: { code } });
    await expect(computeHashes("x", algorithms as never)).rejects.toMatchObject({ code });
  });

  it("accepts exactly the maximum number of (duplicate) entries", () => {
    expect(normalizeAlgorithms(Array.from({ length: MAX_REQUESTED_ALGORITHMS }, () => "md5"))).toEqual({
      ok: true,
      algorithms: ["md5"],
    });
  });

  it("defaults to every supported algorithm", () => {
    expect(normalizeAlgorithms(undefined)).toEqual({ ok: true, algorithms: ["md5", "sha1", "sha256"] });
  });
});

describe("error handling", () => {
  it("reports a missing Web Crypto (insecure context) instead of returning partial results", async () => {
    await expect(computeHashes("hello", ALLOWED_ALGORITHMS, null)).rejects.toMatchObject({
      code: "WEB_CRYPTO_UNAVAILABLE",
    });
  });

  it("still computes MD5 alone without Web Crypto", async () => {
    await expect(computeHashes("hello", ["md5"], null)).resolves.toEqual({ md5: "5d41402abc4b2a76b9719d911017c592" });
  });

  it("detects a missing crypto.subtle", () => {
    vi.stubGlobal("crypto", {});
    expect(webCryptoDigest()).toBeNull();
  });

  it("wraps a Web Crypto failure without leaking the input in the message", async () => {
    const digest = vi.fn<Digest>(async () => {
      throw new DOMException("boom", "OperationError");
    });
    const error = await computeHashes("secret-canary", ["sha1"], digest).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(HashError);
    expect(error).toMatchObject({ code: "DIGEST_FAILED" });
    expect(String((error as Error).message)).not.toContain("secret-canary");
  });

  it("recovers on the next input after a failure", async () => {
    let fail = true;
    const digest: Digest = (name, data) => {
      if (fail) return Promise.reject(new Error("transient"));
      return globalThis.crypto.subtle.digest(name, data);
    };
    await expect(computeHashes("hello", ["sha1"], digest)).rejects.toMatchObject({ code: "DIGEST_FAILED" });
    fail = false;
    await expect(computeHashes("hello", ["sha1"], digest)).resolves.toEqual(serverHashes("hello", ["sha1"]));
  });
});

describe("privacy", () => {
  it("makes no network or storage call while hashing", async () => {
    const forbidden = {
      fetch: vi.fn(),
      XMLHttpRequest: vi.fn(),
      WebSocket: vi.fn(),
      EventSource: vi.fn(),
      navigator: { sendBeacon: vi.fn() },
      localStorage: { setItem: vi.fn(), getItem: vi.fn() },
      sessionStorage: { setItem: vi.fn(), getItem: vi.fn() },
    };
    for (const [name, value] of Object.entries(forbidden)) vi.stubGlobal(name, value);
    await computeHashes("synthetic-canary-3f9a", ALLOWED_ALGORITHMS);
    expect(forbidden.fetch).not.toHaveBeenCalled();
    expect(forbidden.XMLHttpRequest).not.toHaveBeenCalled();
    expect(forbidden.WebSocket).not.toHaveBeenCalled();
    expect(forbidden.EventSource).not.toHaveBeenCalled();
    expect(forbidden.navigator.sendBeacon).not.toHaveBeenCalled();
    expect(forbidden.localStorage.setItem).not.toHaveBeenCalled();
    expect(forbidden.sessionStorage.setItem).not.toHaveBeenCalled();
  });

  // A regression tripwire, not proof: the evidence that the input stays in
  // the browser comes from observing real browser traffic. This only stops a
  // network or persistence API from being added to the hash path unnoticed.
  it.each(["lib/hash-local.ts", "lib/md5.ts", "components/tools/HashTool.tsx"])(
    "%s references no network, persistence or dynamic-code API",
    (path) => {
      const source = readFileSync(path, "utf8").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
      expect(source).not.toMatch(
        /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|cookie|postMessage|importScripts|eval|Function)\b|import\s*\(/
      );
    }
  );
});

describe("rapid input changes and out-of-order results", () => {
  it("never lets a superseded input overwrite the current result", async () => {
    // Two edits in a row; the first digest finishes last.
    const pending: { resolve: () => void }[] = [];
    const slowDigest: Digest = (name, data) =>
      new Promise((resolve) => {
        pending.push({ resolve: () => resolve(globalThis.crypto.subtle.digest(name, data)) });
      });

    let state: ResultState<Record<"sha256", string>> = initialResultState();
    state = startResult(editResultInput(state, "first"));
    const firstVersion = state.version;
    const first = computeHashes("first", ["sha256"], slowDigest);

    state = startResult(editResultInput(state, "second"));
    const secondVersion = state.version;
    const second = computeHashes("second", ["sha256"], slowDigest);

    pending[1].resolve();
    state = resolveResult(state, secondVersion, await second);
    pending[0].resolve();
    state = resolveResult(state, firstVersion, await first);

    expect(state).toMatchObject({
      status: "success",
      input: "second",
      result: { sha256: createHash("sha256").update("second").digest("hex") },
    });
  });

  it("keeps only the last of 40 edits when their digests settle in random order", async () => {
    const next = xorshift(2026);
    const settle: (() => void)[] = [];
    // Each SHA digest waits until the test settles it. Some superseded
    // computations fail late; that must not surface either.
    const delayedDigest = (mayFail: boolean): Digest => (name, data) =>
      new Promise((resolve, reject) => {
        settle.push(() => {
          if (mayFail && next() % 5 === 0) reject(new Error("late failure"));
          else resolve(globalThis.crypto.subtle.digest(name, data));
        });
      });

    let state: ResultState<Record<AllowedAlgorithm, string>> = initialResultState();
    const runs: Promise<void>[] = [];
    const inputs = Array.from({ length: 40 }, (_, i) => `input-${i}-${"é".repeat(i)}`);
    inputs.forEach((input, index) => {
      state = startResult(editResultInput(state, input));
      const version = state.version;
      runs.push(
        computeHashes(input, ALLOWED_ALGORITHMS, delayedDigest(index < inputs.length - 1)).then(
          (hashes) => { state = resolveResult(state, version, hashes); },
          (error: HashError) => { state = rejectResult(state, version, error.code); }
        )
      );
    });

    // computeHashes requests both SHA digests synchronously, so the last two
    // entries belong to the last edit. Settle all the others first, shuffled.
    const lastEdit = settle.splice(-2);
    for (let i = settle.length - 1; i > 0; i--) {
      const j = next() % (i + 1);
      [settle[i], settle[j]] = [settle[j], settle[i]];
    }
    for (const run of settle) run();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(state).toMatchObject({ status: "loading", input: inputs.at(-1) });

    for (const run of lastEdit.reverse()) run();
    await Promise.allSettled(runs);
    expect(state).toMatchObject({ status: "success", input: inputs.at(-1), result: serverHashes(inputs.at(-1)!) });
  });
});
