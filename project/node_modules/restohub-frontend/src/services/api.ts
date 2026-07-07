const API_BASE = (import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL || '/api';

const getAuthToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem('restohub_token');
};

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  const token = getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    headers,
    ...init,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text || `Request failed: ${response.status}`;
    try {
      const parsed = text ? JSON.parse(text) : null;
      if (parsed && typeof parsed === 'object' && typeof parsed.message === 'string') {
        message = parsed.message;
      }
    } catch {
      // Keep the raw text response if it is not valid JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

export const api = {
  get: <T>(path: string) => requestJson<T>(path),
  post: <T>(path: string, body: unknown) => requestJson<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => requestJson<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => requestJson<T>(path, { method: 'DELETE' }),
};
