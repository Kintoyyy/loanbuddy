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

export interface LoanPayment {
  payment_id: string;
  loan_id: string;
  amount: number;
  note: string | null;
  payment_date: string;
  created_at: string;
}

export interface Loan {
  loan_id: string;
  lender_id: string;
  borrower_name: string;
  amount: number;
  description: string | null;
  date_lent: string;
  due_date: string | null;
  status: "active" | "paid";
  created_at: string;
  updated_at: string;
  loan_payments: LoanPayment[];
  remaining_balance: number;
  paid_amount: number;
}

export interface LoanRequest {
  borrowerName: string;
  amount: number;
  description?: string;
  dateLent: string;
  dueDate?: string;
  status?: string;
}

export interface LoanPaymentRequest {
  amount: number;
  note?: string;
  paymentDate: string;
}

export interface Debtor {
  debtor_id: string;
  user_id: string;
  debtor_name: string;
  debtor_type: "Person" | "Entity" | "Organization";
  phone_number: string | null;
  email: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  total_owed?: number;
  open_entries_count?: number;
}

export interface DebtorRequest {
  debtor_name: string;
  debtor_type: "Person" | "Entity" | "Organization";
  phone_number?: string;
  email?: string;
}

export interface Entry {
  entry_id: string;
  user_id: string;
  debtor_id: string;
  debtor_name: string;
  original_amount: number;
  currency: string;
  lending_date: string;
  expected_payback_date: string | null;
  actual_closed_date: string | null;
  entry_status: "Open" | "Partially Collected" | "Closed";
  is_archived: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  total_collected?: number;
  still_owed?: number;
}

export interface EntryRequest {
  debtor_id: string;
  original_amount: number;
  currency?: string;
  lending_date: string;
  expected_payback_date?: string;
  notes?: string;
}

export interface EntryCollection {
  collection_id: string;
  entry_id: string;
  user_id: string;
  amount_collected: number;
  collection_date: string;
  payment_method: "Cash" | "Bank Transfer" | "GCash" | "PayMaya" | "Check" | "Online Transfer" | "Card" | "Other";
  notes: string | null;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CollectionRequest {
  amount_collected: number;
  collection_date: string;
  payment_method?: EntryCollection["payment_method"];
  notes?: string;
  transaction_id?: string;
}

export function getLoans(): Promise<Loan[]> {
  return apiRequest<Loan[]>("/loans", { method: "GET" }, true);
}

export function createLoan(payload: LoanRequest): Promise<Loan> {
  return apiRequest<Loan>("/loans", { method: "POST", body: JSON.stringify(payload) }, true);
}

export function updateLoan(loanId: string, payload: LoanRequest): Promise<Loan> {
  return apiRequest<Loan>(`/loans/${loanId}`, { method: "PUT", body: JSON.stringify(payload) }, true);
}

export function deleteLoan(loanId: string): Promise<void> {
  return apiRequest<void>(`/loans/${loanId}`, { method: "DELETE" }, true);
}

export function addPayment(loanId: string, payload: LoanPaymentRequest): Promise<LoanPayment> {
  return apiRequest<LoanPayment>(`/loans/${loanId}/payments`, { method: "POST", body: JSON.stringify(payload) }, true);
}

export function deletePayment(loanId: string, paymentId: string): Promise<void> {
  return apiRequest<void>(`/loans/${loanId}/payments/${paymentId}`, { method: "DELETE" }, true);
}

export function getDebtors(): Promise<Debtor[]> {
  return apiRequest<Debtor[]>("/debtors", { method: "GET" }, true);
}

export function createDebtor(payload: DebtorRequest): Promise<Debtor> {
  return apiRequest<Debtor>("/debtors", { method: "POST", body: JSON.stringify(payload) }, true);
}

export function updateDebtor(debtorId: string, payload: DebtorRequest): Promise<Debtor> {
  return apiRequest<Debtor>(`/debtors/${debtorId}`, { method: "PUT", body: JSON.stringify(payload) }, true);
}

export function archiveDebtor(debtorId: string): Promise<void> {
  return apiRequest<void>(`/debtors/${debtorId}`, { method: "DELETE" }, true);
}

export function getEntries(): Promise<Entry[]> {
  return apiRequest<Entry[]>("/entries", { method: "GET" }, true);
}

export function createEntry(payload: EntryRequest): Promise<Entry> {
  return apiRequest<Entry>("/entries", { method: "POST", body: JSON.stringify(payload) }, true);
}

export function updateEntry(entryId: string, payload: EntryRequest): Promise<Entry> {
  return apiRequest<Entry>(`/entries/${entryId}`, { method: "PUT", body: JSON.stringify(payload) }, true);
}

export function archiveEntry(entryId: string): Promise<void> {
  return apiRequest<void>(`/entries/${entryId}`, { method: "DELETE" }, true);
}

export function getEntryCollections(entryId: string): Promise<EntryCollection[]> {
  return apiRequest<EntryCollection[]>(`/entries/${entryId}/collections`, { method: "GET" }, true);
}

export function createCollection(entryId: string, payload: CollectionRequest): Promise<EntryCollection> {
  return apiRequest<EntryCollection>(`/entries/${entryId}/collections`, { method: "POST", body: JSON.stringify(payload) }, true);
}

export function updateCollection(collectionId: string, payload: CollectionRequest): Promise<EntryCollection> {
  return apiRequest<EntryCollection>(`/collections/${collectionId}`, { method: "PUT", body: JSON.stringify(payload) }, true);
}

export function deleteCollection(collectionId: string): Promise<void> {
  return apiRequest<void>(`/collections/${collectionId}`, { method: "DELETE" }, true);
}