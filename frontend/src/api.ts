const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || "http://localhost:8080";
export const TOKEN_KEY = "regenta_anniversary_admin_token";

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers || {}) as Record<string, string>)
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `API request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export async function adminLogin(email: string, password: string) {
  return api<any>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}