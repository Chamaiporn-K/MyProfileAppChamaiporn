import { API_BASE_URL } from './constants';

type ApiOptions = RequestInit & {
  headers?: Record<string, string>;
};

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export async function apiCall(endpoint: string, options: ApiOptions = {}) {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${path}`;

  const config: ApiOptions = {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  };

  const response = await fetch(url, config);
  const text = await response.text();

  let data: any;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const errorMessage = data?.error || data || response.statusText;
    throw new Error(errorMessage);
  }

  return data;
}
