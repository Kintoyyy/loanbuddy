import { clearAuth, getAccessToken } from "./auth";

const DEV_BACKEND_ORIGIN = "http://localhost:8080";

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function resolveApiBaseUrl(): string {
  const configuredBaseUrl = process.env.REACT_APP_API_BASE_URL?.trim();

  if (!configuredBaseUrl) {
    return process.env.NODE_ENV === "development" ? `${DEV_BACKEND_ORIGIN}/api` : "/api";
  }

  if (/^https?:\/\//i.test(configuredBaseUrl)) {
    return stripTrailingSlash(configuredBaseUrl);
  }

  if (process.env.NODE_ENV === "development") {
    return `${DEV_BACKEND_ORIGIN}${configuredBaseUrl.startsWith("/") ? configuredBaseUrl : `/${configuredBaseUrl}`}`;
  }

  return configuredBaseUrl;
}

const API_BASE_URL = resolveApiBaseUrl();

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
  birthday: string;
}

export interface RegisterResponse {
  message: string;
  user_id: string;
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user_id: string;
}

export interface ProfileResponse {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  birthday: string | null;
  phone: string | null;
  bio: string | null;
  photo_filename: string | null;
  photo_mime_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  username: string;
  birthday: string;
  phone: string;
  bio: string;
}

export interface UpdateProfileResponse {
  message: string;
  profile: ProfileResponse;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdatePasswordResponse {
  message: string;
}

export interface UploadPhotoResponse {
  message: string;
  file_reference: string;
  size_bytes: number;
}

function getErrorMessage(responseBody: Record<string, unknown> | null, fallback: string): string {
  const message = responseBody?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

function isJwtSessionError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("invalid jwt") ||
    normalized.includes("token is expired") ||
    normalized.includes("invalid access token") ||
    normalized.includes("bearer token is required")
  );
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  requiresAuth = false
): Promise<T> {
  const headers = new Headers(options.headers || {});

  const hasBody = options.body !== undefined && options.body !== null;

  if (hasBody && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (requiresAuth) {
    const token = getAccessToken();
    if (!token) {
      clearAuth();
      throw new Error("No access token found. Please login first.");
    }

    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "omit",
  });

  const rawBody = await response.text();
  let responseBody: Record<string, unknown> | null = null;

  if (rawBody) {
    try {
      responseBody = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      responseBody = null;
    }
  }

  if (!response.ok) {
    const message = getErrorMessage(responseBody, rawBody || `Request failed with status ${response.status}`);

    if (response.status === 400 && requiresAuth && !responseBody) {
      clearAuth();
      throw new Error("Your session is invalid or too large. Please login again.");
    }

    if (response.status === 401 || response.status === 403 || response.status === 431 || isJwtSessionError(message)) {
      clearAuth();
    }

    if (response.status === 401 || response.status === 403 || isJwtSessionError(message)) {
      throw new Error("Session expired. Please login again.");
    }

    if (response.status === 431) {
      throw new Error("Request headers are too large. Your session was cleared. Please sign in again.");
    }

    throw new Error(message);
  }

  return responseBody as T;
}

export function registerUser(payload: RegisterRequest): Promise<RegisterResponse> {
  return apiRequest<RegisterResponse>("/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginUser(payload: LoginRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getProfile(): Promise<ProfileResponse> {
  return apiRequest<ProfileResponse>("/profile", { method: "GET" }, true);
}

export function updateProfile(payload: UpdateProfileRequest): Promise<UpdateProfileResponse> {
  return apiRequest<UpdateProfileResponse>(
    "/profile",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    true
  );
}

export function updatePassword(payload: UpdatePasswordRequest): Promise<UpdatePasswordResponse> {
  return apiRequest<UpdatePasswordResponse>(
    "/profile/password",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    true
  );
}

export function uploadPhoto(file: File): Promise<UploadPhotoResponse> {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest<UploadPhotoResponse>(
    "/profile/photo",
    {
      method: "POST",
      body: formData,
    },
    true
  );
}

export async function getProfilePhotoBlob(): Promise<Blob | null> {
  const token = getAccessToken();
  if (!token) {
    clearAuth();
    throw new Error("No access token found. Please login first.");
  }

  const response = await fetch(`${API_BASE_URL}/profile/photo`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "omit",
  });

  if (response.status === 204 || response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const rawBody = await response.text();
    const message = rawBody || `Request failed with status ${response.status}`;

    if (response.status === 401 || response.status === 403 || response.status === 431 || isJwtSessionError(message)) {
      clearAuth();
    }

    if (response.status === 401 || response.status === 403 || isJwtSessionError(message)) {
      throw new Error("Session expired. Please login again.");
    }

    if (response.status === 431) {
      throw new Error("Request headers are too large. Your session was cleared. Please sign in again.");
    }

    throw new Error(message);
  }

  const blob = await response.blob();
  return blob.size > 0 ? blob : null;
}