export type JsonTextMode = "format" | "minify";

type TokenKind =
  | "{"
  | "}"
  | "["
  | "]"
  | ":"
  | ","
  | "string"
  | "number"
  | "literal";

type Token = { kind: TokenKind; raw: string; position: number };

export class JsonTextError extends Error {
  constructor(message: string, readonly position: number) {
    super(`${message} at position ${position}.`);
    this.name = "JsonTextError";
  }
}

function readString(input: string, start: number): number {
  let index = start + 1;

  while (index < input.length) {
    const character = input[index];
    if (character === '"') return index + 1;
    if (character.charCodeAt(0) <= 0x1f) {
      throw new JsonTextError("Unescaped control character in string", index);
    }
    if (character !== "\\") {
      index += 1;
      continue;
    }

    index += 1;
    const escape = input[index];
    if (!escape) throw new JsonTextError("Unterminated escape sequence", index);
    if ('"\\/bfnrt'.includes(escape)) {
      index += 1;
      continue;
    }
    if (escape !== "u" || !/^[0-9a-fA-F]{4}$/.test(input.slice(index + 1, index + 5))) {
      throw new JsonTextError("Invalid string escape", index);
    }
    index += 5;
  }

  throw new JsonTextError("Unterminated string", start);
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < input.length) {
    const character = input[index];
    if (character === " " || character === "\t" || character === "\r" || character === "\n") {
      index += 1;
      continue;
    }
    if ("{}[]:,".includes(character)) {
      tokens.push({ kind: character as TokenKind, raw: character, position: index });
      index += 1;
      continue;
    }
    if (character === '"') {
      const end = readString(input, index);
      tokens.push({ kind: "string", raw: input.slice(index, end), position: index });
      index = end;
      continue;
    }
    if (character === "-" || /[0-9]/.test(character)) {
      const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(input.slice(index));
      if (!match) throw new JsonTextError("Invalid number", index);
      tokens.push({ kind: "number", raw: match[0], position: index });
      index += match[0].length;
      continue;
    }

    const literal = ["true", "false", "null"].find((value) => input.startsWith(value, index));
    if (literal) {
      tokens.push({ kind: "literal", raw: literal, position: index });
      index += literal.length;
      continue;
    }

    throw new JsonTextError("Unexpected character", index);
  }

  return tokens;
}

export function transformJsonText(input: string, mode: JsonTextMode): string {
  if (input.trim() === "") throw new JsonTextError("JSON input is empty", 0);

  const tokens = tokenize(input);
  let cursor = 0;
  const indent = (depth: number) => "  ".repeat(depth);

  function peek(): Token | undefined {
    return tokens[cursor];
  }

  function take(kind?: TokenKind): Token {
    const token = tokens[cursor];
    if (!token) throw new JsonTextError(`Expected ${kind ?? "JSON value"}`, input.length);
    if (kind && token.kind !== kind) {
      throw new JsonTextError(`Expected ${kind}`, token.position);
    }
    cursor += 1;
    return token;
  }

  function parseValue(depth: number): string {
    const token = peek();
    if (!token) throw new JsonTextError("Expected JSON value", input.length);

    if (token.kind === "string" || token.kind === "number" || token.kind === "literal") {
      return take().raw;
    }
    if (token.kind === "{") return parseObject(depth);
    if (token.kind === "[") return parseArray(depth);
    throw new JsonTextError("Expected JSON value", token.position);
  }

  function parseObject(depth: number): string {
    take("{");
    if (peek()?.kind === "}") {
      take("}");
      return "{}";
    }

    const members: string[] = [];
    while (true) {
      const key = take("string").raw;
      take(":");
      const separator = mode === "format" ? ": " : ":";
      members.push(`${key}${separator}${parseValue(depth + 1)}`);
      if (peek()?.kind !== ",") break;
      take(",");
    }
    take("}");

    if (mode === "minify") return `{${members.join(",")}}`;
    return `{\n${indent(depth + 1)}${members.join(`,\n${indent(depth + 1)}`)}\n${indent(depth)}}`;
  }

  function parseArray(depth: number): string {
    take("[");
    if (peek()?.kind === "]") {
      take("]");
      return "[]";
    }

    const values: string[] = [];
    while (true) {
      values.push(parseValue(depth + 1));
      if (peek()?.kind !== ",") break;
      take(",");
    }
    take("]");

    if (mode === "minify") return `[${values.join(",")}]`;
    return `[\n${indent(depth + 1)}${values.join(`,\n${indent(depth + 1)}`)}\n${indent(depth)}]`;
  }

  const output = parseValue(0);
  const trailing = peek();
  if (trailing) throw new JsonTextError("Unexpected token", trailing.position);
  return output;
}

export function formatJsonText(input: string): string {
  return transformJsonText(input, "format");
}

export function minifyJsonText(input: string): string {
  return transformJsonText(input, "minify");
}
