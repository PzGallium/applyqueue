/**
 * API client — uses relative /api for same-origin (hosting rewrite) or proxy.
 * All requests attach Firebase ID token when user is authenticated.
 */

const getBaseUrl = () => '';

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...init } = options;
  const url = `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...init, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = (data?.error ?? {}) as ApiError;
    throw new Error(err.message || data?.message || `Request failed: ${res.status}`);
  }
  return data as T;
}
