import type { ApiErrorBody } from '@mtt/shared';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly details: string[],
  ) {
    super(details.join('. ') || `Request failed with status ${status}`);
    this.name = 'ApiError';
  }
}

/** Thin fetch wrapper: JSON in/out, and every non-2xx response becomes an ApiError. */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    });
  } catch {
    throw new ApiError(0, ['Unable to reach the server. Is the API running?']);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    const message = body?.message ?? response.statusText;
    throw new ApiError(response.status, Array.isArray(message) ? message : [message]);
  }

  // 204 No Content (e.g. DELETE) has no body to parse.
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
