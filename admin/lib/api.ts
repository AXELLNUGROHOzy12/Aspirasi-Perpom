export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}

// Alamat backend (Railway), mis. https://api.domain.com. Nilai NEXT_PUBLIC_* ikut tertanam saat build.
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const method = (init.method ?? 'GET').toUpperCase();
  if (method !== 'GET') headers.set('X-Requested-With', 'aspirasi');
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api${path}`, { ...init, headers, credentials: 'include', cache: 'no-store' });
  } catch {
    throw new ApiError(0, 'Tidak bisa terhubung ke server. Periksa koneksi internetmu lalu coba lagi.', 'NETWORK');
  }

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, json?.error?.message ?? 'Terjadi masalah. Silakan coba lagi.', json?.error?.code, json?.error?.fields);
  }
  return json?.data as T;
}

const body = (data: unknown) => (data === undefined ? undefined : JSON.stringify(data));

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) => request<T>(path, { method: 'POST', body: data instanceof FormData ? data : body(data) }),
  patch: <T>(path: string, data?: unknown) => request<T>(path, { method: 'PATCH', body: data instanceof FormData ? data : body(data) }),
  put: <T>(path: string, data?: unknown) => request<T>(path, { method: 'PUT', body: data instanceof FormData ? data : body(data) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export const errorMessage = (e: unknown) => (e instanceof ApiError ? e.message : 'Terjadi masalah. Silakan coba lagi.');
