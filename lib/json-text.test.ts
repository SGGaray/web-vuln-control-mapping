import { describe, expect, it } from "vitest";
import { editResultInput, initialResultState, resolveResult } from "./result-state";
import { formatJsonText, minifyJsonText } from "./json-text";

describe("lossless JSON text formatting", () => {
  it("formats ordinary nested objects and arrays", () => {
    expect(formatJsonText('{"a":1,"nested":{"ok":true},"items":[null,"x"]}')).toBe(
      '{\n  "a": 1,\n  "nested": {\n    "ok": true\n  },\n  "items": [\n    null,\n    "x"\n  ]\n}'
    );
  });

  it.each([
    "9007199254740993",
    "-9007199254740993",
    "1e400",
    "-1e400",
    "-0",
    "1.2300",
    "1e+10",
  ])("preserves the numeric lexeme %s", (lexeme) => {
    expect(formatJsonText(`{"n":${lexeme}}`)).toContain(`"n": ${lexeme}`);
    expect(minifyJsonText(` { "n" : ${lexeme} } `)).toBe(`{"n":${lexeme}}`);
  });

  it("preserves duplicate keys in their original order", () => {
    expect(minifyJsonText('{ "x": 1, "x": 2 }')).toBe('{"x":1,"x":2}');
    expect(formatJsonText('{"x":1,"x":2}').match(/"x"/g)).toHaveLength(2);
  });

  it("preserves escaped quotes and Unicode escape lexemes", () => {
    const input = '{"quote":"a\\\"b","escaped":"\\u0041","literal":"A"}';
    expect(minifyJsonText(input)).toBe(input);
  });

  it("removes only insignificant whitespace when minifying", () => {
    expect(minifyJsonText(' \n { \t "a" : [ 1 , 2 ] } \r ')).toBe('{"a":[1,2]}');
  });

  it.each(["", "{", '{"x":}', "[1,]", '{"x":01}', '"bad\nstring"']) (
    "rejects malformed or empty input without partial output: %j",
    (input) => expect(() => formatJsonText(input)).toThrow()
  );

  it.each([
    ["format", formatJsonText],
    ["minify", minifyJsonText],
  ] as const)("invalidates a %s result after editing", (_name, transform) => {
    const initial = editResultInput(initialResultState<string>(), '{"n":1}');
    const completed = resolveResult(initial, initial.version, transform(initial.input));
    const edited = editResultInput(completed, '{"n":2}');
    expect(edited).toMatchObject({ status: "idle", input: '{"n":2}' });
    expect(edited).not.toHaveProperty("result");
  });
});
