export class ApiClientError extends Error {}

/**
 * Thin wrapper around `fetch` for calls the browser makes to our own API
 * routes. Every route responds with `{ error: string }` on failure (see
 * `src/lib/api/errors.ts`), so this is the one place that unwraps that
 * shape into a throwable, human-readable error — components just try/catch
 * and show `error.message`, never a raw response dump.
 */
export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : "Something went wrong. Please try again.";
    throw new ApiClientError(message);
  }

  return data as T;
}
