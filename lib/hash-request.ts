export type HashRequestFailure = "api" | "network" | "aborted" | "invalid-response";

export class HashRequestError extends Error {
  constructor(
    message: string,
    readonly kind: HashRequestFailure,
    readonly status?: number
  ) {
    super(message);
    this.name = "HashRequestError";
  }
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

async function apiErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: string | { message?: unknown };
    };
    if (typeof body.error === "string" && body.error) return body.error;
    if (typeof body.error === "object" && typeof body.error?.message === "string") {
      return body.error.message;
    }
  } catch {
    // Use the status fallback for empty and non-JSON responses.
  }
  return `Hash request failed with HTTP ${response.status}.`;
}

export async function requestHashes<T extends string>(
  input: string,
  algorithms: readonly T[],
  signal: AbortSignal,
  fetcher: Fetcher = fetch
): Promise<Record<T, string>> {
  let response: Response;
  try {
    response = await fetcher("/api/hash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: input, algorithms }),
      signal,
    });
  } catch (error) {
    if (signal.aborted || (error as Error).name === "AbortError") {
      throw new HashRequestError("Hash request was superseded.", "aborted");
    }
    throw new HashRequestError("Could not reach the hashing service.", "network");
  }

  if (!response.ok) {
    throw new HashRequestError(
      `HTTP ${response.status}: ${await apiErrorMessage(response)}`,
      "api",
      response.status
    );
  }

  let body: { hashes?: Partial<Record<T, unknown>> };
  try {
    body = (await response.json()) as typeof body;
  } catch {
    throw new HashRequestError("The hashing service returned invalid JSON.", "invalid-response");
  }
  if (!body.hashes || algorithms.some((algorithm) => typeof body.hashes?.[algorithm] !== "string")) {
    throw new HashRequestError("The hashing service returned an invalid response.", "invalid-response");
  }
  return body.hashes as Record<T, string>;
}
