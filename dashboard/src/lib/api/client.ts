/**
 * Client HTTP unique du dashboard.
 *
 * Le backend renvoie toujours `{ detail, code }` sur erreur : le client remonte
 * les deux, pour que l'interface puisse réagir au code plutôt qu'au texte.
 */

import { API_URL } from "../config";
import { closeSession, getAuthToken } from "../session";

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

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** Un 401 ferme la session, sauf sur la connexion elle-même. */
  signOutOn401?: boolean;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers: extra = {}, signOutOn401 = true } = options;

  const headers = new Headers({ Accept: "application/json", ...extra });
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (body !== undefined) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      "Connexion au serveur impossible. Vérifiez que l’API est démarrée.",
      "NETWORK_ERROR",
      0,
    );
  }

  if (response.status === 401 && signOutOn401) {
    closeSession();
    throw new ApiError("Session expirée. Reconnectez-vous.", "UNAUTHORIZED", 401);
  }

  if (!response.ok) {
    throw new ApiError(...(await describe(response)));
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/**
 * FastAPI imbrique nos erreurs sous `detail` ; une erreur de validation Pydantic
 * y met une liste. Les deux formes doivent produire un message lisible.
 */
async function describe(response: Response): Promise<[string, string, number]> {
  const fallback: [string, string, number] = [
    "Une erreur est survenue.",
    `HTTP_${response.status}`,
    response.status,
  ];

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return fallback;
  }

  if (typeof payload !== "object" || payload === null) return fallback;
  const detail = (payload as { detail?: unknown }).detail;

  if (typeof detail === "object" && detail !== null && "detail" in detail) {
    const inner = detail as { detail?: unknown; code?: unknown };
    return [
      typeof inner.detail === "string" ? inner.detail : fallback[0],
      typeof inner.code === "string" ? inner.code : fallback[1],
      response.status,
    ];
  }

  if (typeof detail === "string") return [detail, fallback[1], response.status];

  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: unknown } | undefined;
    const message = typeof first?.msg === "string" ? first.msg : fallback[0];
    return [message, "VALIDATION_ERROR", response.status];
  }

  return fallback;
}
