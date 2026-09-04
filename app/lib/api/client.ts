/**
 * KashFlow — Client fetch unique.
 * Injection du JWT, gestion centralisée des erreurs. Aucune logique métier ici :
 * chaque endpoint typé vit dans lib/api/endpoints.ts.
 */
import type { ApiError } from '@shared/api/types';
import { API_BASE_URL } from '../config';
import { getToken } from './auth-storage';

export class ApiClientError extends Error {
  code: string;
  status: number;

  constructor(status: number, error: ApiError) {
    super(error.detail);
    this.code = error.code;
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean; // défaut true : la plupart des endpoints exigent le JWT
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let error: ApiError;
    try {
      error = await response.json();
    } catch {
      error = { detail: response.statusText, code: 'UNKNOWN_ERROR' };
    }
    throw new ApiClientError(response.status, error);
  }

  return (await response.json()) as T;
}
