export class ApiError extends Error {
  status: number;
  issues?: unknown;
  constructor(message: string, status: number, issues?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.issues = issues;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

/** Thin fetch wrapper for JSON APIs used by client components. */
export async function apiRequest<T = unknown>(
  url: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers, ...rest } = options;
  const res = await fetch(url, {
    ...rest,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      issues?: unknown;
    };
    throw new ApiError(
      data.error ?? `Forespørselen feilet (${res.status}).`,
      res.status,
      data.issues,
    );
  }

  if (res.status === 204) return null as T;
  return (await res.json()) as T;
}
