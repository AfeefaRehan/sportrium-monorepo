const TOKEN_KEY = "adminToken";

export function setTokens(access: string) {
  if (access) localStorage.setItem(TOKEN_KEY, access);
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function isLoggedIn(): boolean {
  return !!getAccessToken();
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

export function initAuth() {
  // place to migrate/refresh later if needed
}
