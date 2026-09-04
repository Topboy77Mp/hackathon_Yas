import { API_URL } from "./config";
import { getAuthToken } from "./authToken";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiErrorPayload = { detail?: string; code?: string };

export async function apiClient<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(init.headers);

  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError("Connexion impossible. Vérifiez votre réseau puis réessayez.", "NETWORK_ERROR", 0);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as ApiErrorPayload;
    throw new ApiError(payload.detail ?? "Une erreur est survenue.", payload.code ?? `HTTP_${response.status}`, response.status);
  }

  return response.json() as Promise<T>;
}
