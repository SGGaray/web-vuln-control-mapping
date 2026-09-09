import { describe, expect, it } from "vitest";
import {
  copyableResult,
  editResultInput,
  initialResultState,
  rejectResult,
  resolveResult,
  startResult,
} from "./result-state";

describe("result provenance state", () => {
  it("invalidates a successful result and its copy value on edit", () => {
    const started = startResult(editResultInput(initialResultState<string>(), "first"));
    const success = resolveResult(started, started.version, "first result");
    const edited = editResultInput(success, "second");
    expect(edited.status).toBe("idle");
    expect(copyableResult(edited)).toBeNull();
  });

  it.each(["validation 400", "too large 413", "server 500", "network failure"])(
    "replaces success with the current error: %s",
    (message) => {
      const success = resolveResult(
        startResult(editResultInput(initialResultState<string>(), "first")),
        1,
        "old result"
      );
      const current = startResult(editResultInput(success, "second"));
      const failed = rejectResult(current, current.version, message);
      expect(failed).toMatchObject({ status: "error", input: "second", message });
      expect(copyableResult(failed)).toBeNull();
    }
  );

  it("ignores a previous response that arrives late", () => {
    const first = startResult(editResultInput(initialResultState<string>(), "first"));
    const second = startResult(editResultInput(first, "second"));
    expect(resolveResult(second, first.version, "late")).toBe(second);
  });

  it("recovers after an error", () => {
    const first = startResult(editResultInput(initialResultState<string>(), "first"));
    const failed = rejectResult(first, first.version, "network");
    const retry = startResult(editResultInput(failed, "retry"));
    expect(resolveResult(retry, retry.version, "ok")).toMatchObject({ status: "success", result: "ok" });
  });
});
