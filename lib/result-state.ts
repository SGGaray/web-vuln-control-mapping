export type ResultState<T> =
  | { status: "idle"; input: string; version: number }
  | { status: "loading"; input: string; version: number }
  | { status: "success"; input: string; version: number; result: T }
  | { status: "error"; input: string; version: number; message: string };

export function initialResultState<T>(): ResultState<T> {
  return { status: "idle", input: "", version: 0 };
}

export function editResultInput<T>(state: ResultState<T>, input: string): ResultState<T> {
  return { status: "idle", input, version: state.version + 1 };
}

export function startResult<T>(state: ResultState<T>): ResultState<T> {
  return { status: "loading", input: state.input, version: state.version };
}

export function resolveResult<T>(
  state: ResultState<T>,
  version: number,
  result: T
): ResultState<T> {
  if (state.version !== version) return state;
  return { status: "success", input: state.input, version, result };
}

export function rejectResult<T>(
  state: ResultState<T>,
  version: number,
  message: string
): ResultState<T> {
  if (state.version !== version) return state;
  return { status: "error", input: state.input, version, message };
}

export function copyableResult<T>(state: ResultState<T>): T | null {
  return state.status === "success" ? state.result : null;
}
