import { describe, expect, it, vi } from "vitest";
import { copyText } from "./clipboard";

describe("copyText", () => {
  it("reports success when the clipboard accepts the text", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(copyText("abc", { writeText })).resolves.toBe("copied");
    expect(writeText).toHaveBeenCalledWith("abc");
  });

  it("reports failure when the Clipboard API is unavailable (insecure context)", async () => {
    await expect(copyText("abc", undefined)).resolves.toBe("failed");
    await expect(copyText("abc", {} as never)).resolves.toBe("failed");
  });

  it("reports failure when the browser rejects the write", async () => {
    const writeText = vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    await expect(copyText("abc", { writeText })).resolves.toBe("failed");
  });

  it("reports failure when writeText throws synchronously", async () => {
    const writeText = () => {
      throw new TypeError("boom");
    };
    await expect(copyText("abc", { writeText })).resolves.toBe("failed");
  });

  it("uses navigator.clipboard by default and fails cleanly without it", async () => {
    // Node has no navigator.clipboard, like an insecure browser context.
    await expect(copyText("abc")).resolves.toBe("failed");
  });
});
