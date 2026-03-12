import { LoginResponse } from "./api";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_ID_KEY = "user_id";
const JWT_PART_COUNT = 3;
const AUTH_CHANGE_EVENT = "loanbuddy-auth-change";

interface JwtPayload {
  exp?: number;
}

function normalizeToken(rawToken: string): string {
  const unquoted = rawToken.replace(/^"|"$/g, "").trim();

  if (/^bearer\s+/i.test(unquoted)) {
    return unquoted.replace(/^bearer\s+/i, "").trim();
  }

  return unquoted;
}

function notifyAuthChange() {
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

function parseJwtPayload(token: string): JwtPayload | null {
  const [, payload] = token.split(".");

  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(window.atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

export function saveAuthSession(loginData: LoginResponse) {
  if (!loginData.access_token) {
    clearAuth();
    throw new Error("Received an invalid session token. Please login again.");
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, loginData.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, loginData.refresh_token);
  localStorage.setItem(USER_ID_KEY, loginData.user_id);
  notifyAuthChange();
}

export function clearAuth() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  notifyAuthChange();
}

export function getAccessToken(): string | null {
  const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);

  if (!storedToken) {
    return null;
  }

  const token = normalizeToken(storedToken);
  const hasWhitespace = /\s/.test(token);
  const isMalformedJwt = token.split(".").length !== JWT_PART_COUNT;
  const payload = isMalformedJwt ? null : parseJwtPayload(token);
  const isExpired = payload?.exp !== undefined && payload.exp * 1000 <= Date.now();
  const hasValidExp = payload?.exp === undefined || Number.isFinite(payload.exp);

  if (!token || hasWhitespace || isMalformedJwt || !payload || !hasValidExp || isExpired) {
    clearAuth();
    return null;
  }

  return token;
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}

export function subscribeToAuthChanges(listener: () => void): () => void {
  window.addEventListener(AUTH_CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}