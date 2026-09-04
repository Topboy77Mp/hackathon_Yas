/**
 * KashFlow — Client fetch unique.
 * Injection du JWT, gestion centralisée des erreurs. Aucune logique métier ici :
 * chaque endpoint typé vit dans lib/api/endpoints.ts.
 */
import type { ApiError } from '@shared/api/types';
import { API_BASE_URL } from '../config';
import { getToken, setToken } from './auth-storage';

export class ApiClientError extends Error {
  code: string;
  status: number;

  constructor(status: number, error: ApiError) {
    super(error.detail);
    this.name = 'ApiClientError';
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

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Panne réseau ou API arrêtée : un message utile, jamais « TypeError: Failed to fetch ».
    throw new ApiClientError(0, {
      detail: 'Connexion impossible. Vérifiez votre réseau puis réessayez.',
      code: 'NETWORK_ERROR',
    });
  }

  if (!response.ok) {
    const error = await readError(response);
    // Jeton expiré ou invalide : le purger, sans quoi l'application reste
    // coincée dans un état « connecté » qui échoue à chaque appel.
    if (response.status === 401) await setToken(null);
    throw new ApiClientError(response.status, error);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/**
 * Le backend renvoie `{detail: {detail, code}}`. Une erreur de validation
 * Pydantic met une liste dans `detail`. Les deux formes doivent produire un
 * message lisible plutôt qu'un « [object Object] ».
 */
async function readError(response: Response): Promise<ApiError> {
  const secours: ApiError = {
    detail: response.statusText || 'Une erreur est survenue.',
    code: `HTTP_${response.status}`,
  };

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return secours;
  }

  if (typeof payload !== 'object' || payload === null) return secours;
  const detail = (payload as { detail?: unknown }).detail;

  if (typeof detail === 'object' && detail !== null && 'detail' in detail) {
    const inner = detail as { detail?: unknown; code?: unknown };
    return {
      detail: typeof inner.detail === 'string' ? inner.detail : secours.detail,
      code: typeof inner.code === 'string' ? inner.code : secours.code,
    };
  }

  if (typeof detail === 'string') return { detail, code: secours.code };

  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: unknown } | undefined;
    return {
      detail: typeof first?.msg === 'string' ? first.msg : secours.detail,
      code: 'VALIDATION_ERROR',
    };
  }

  return secours;
}
