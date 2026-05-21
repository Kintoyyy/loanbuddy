import { clearAuth, getAccessToken } from "./auth";

const DEV_BACKEND_ORIGIN = "https://api-loanbuddy.kintoyyy.com";

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function resolveApiBaseUrl(): string {
  const configuredBaseUrl = process.env.REACT_APP_API_BASE_URL?.trim();

  if (!configuredBaseUrl) {
    // When no explicit base URL is provided, prefer the API hostname so
    // production builds call the API host directly (api-loanbuddy.kintoyyy.com).
    return `${DEV_BACKEND_ORIGIN}/api`;
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

const REQUEST_CACHE_PREFIX = "loanbuddy-api-cache";
const REQUEST_CACHE_TTL_MS = 30_000;
const PROFILE_PHOTO_CACHE_TTL_MS = 60_000;

const requestPromiseCache = new Map<string, Promise<unknown>>();
const profilePhotoCache = new Map<string, { expiresAt: number; blob: Blob | null }>();

function getSessionStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function hashValue(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16);
}

function buildCacheKey(scope: string): string | null {
  const token = getAccessToken();
  if (!token) {
    return null;
  }

  return `${REQUEST_CACHE_PREFIX}:${scope}:${hashValue(token)}`;
}

function readCachedJson<T>(cacheKey: string): T | null {
  const storage = getSessionStorage();
  if (!storage) {
    return null;
  }

  const rawValue = storage.getItem(cacheKey);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as { expiresAt?: number; data?: T };
    if (!parsed || typeof parsed.expiresAt !== "number" || parsed.expiresAt <= Date.now()) {
      storage.removeItem(cacheKey);
      return null;
    }

    return parsed.data ?? null;
  } catch {
    storage.removeItem(cacheKey);
    return null;
  }
}

function writeCachedJson<T>(cacheKey: string, data: T, ttlMs: number): void {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }

  storage.setItem(cacheKey, JSON.stringify({ expiresAt: Date.now() + ttlMs, data }));
}

function invalidateCachedJson(cacheKey: string | null): void {
  if (!cacheKey) {
    return;
  }

  getSessionStorage()?.removeItem(cacheKey);
  requestPromiseCache.delete(cacheKey);
}

function invalidateCachedJsonScopes(...scopes: string[]): void {
  for (const scope of scopes) {
    invalidateCachedJson(buildCacheKey(scope));
  }
}

function getCachedJson<T>(scope: string, loader: () => Promise<T>, ttlMs = REQUEST_CACHE_TTL_MS): Promise<T> {
  const cacheKey = buildCacheKey(scope);
  if (!cacheKey) {
    return loader();
  }

  const cachedValue = readCachedJson<T>(cacheKey);
  if (cachedValue !== null) {
    return Promise.resolve(cachedValue);
  }

  const inFlightRequest = requestPromiseCache.get(cacheKey);
  if (inFlightRequest) {
    return inFlightRequest as Promise<T>;
  }

  const request = loader()
    .then((response) => {
      writeCachedJson(cacheKey, response, ttlMs);
      return response;
    })
    .finally(() => {
      requestPromiseCache.delete(cacheKey);
    });

  requestPromiseCache.set(cacheKey, request);
  return request;
}

function getCachedProfilePhoto(scope: string, loader: () => Promise<Blob | null>, ttlMs = PROFILE_PHOTO_CACHE_TTL_MS): Promise<Blob | null> {
  const cacheKey = buildCacheKey(scope);
  if (!cacheKey) {
    return loader();
  }

  const cachedValue = profilePhotoCache.get(cacheKey);
  if (cachedValue && cachedValue.expiresAt > Date.now()) {
    return Promise.resolve(cachedValue.blob);
  }

  const inFlightRequest = requestPromiseCache.get(cacheKey);
  if (inFlightRequest) {
    return inFlightRequest as Promise<Blob | null>;
  }

  const request = loader()
    .then((response) => {
      profilePhotoCache.set(cacheKey, { expiresAt: Date.now() + ttlMs, blob: response });
      return response;
    })
    .finally(() => {
      requestPromiseCache.delete(cacheKey);
    });

  requestPromiseCache.set(cacheKey, request);
  return request;
}

function invalidateProfileDataCache(): void {
  invalidateCachedJsonScopes("profile");
}

function invalidateDomainDataCache(): void {
  invalidateCachedJsonScopes("loans", "debtors", "entries");
}

function invalidateProfilePhotoCache(): void {
  const cacheKey = buildCacheKey("profile-photo");
  if (cacheKey) {
    profilePhotoCache.delete(cacheKey);
  }
  invalidateCachedJson(cacheKey);
}

function withDomainCacheInvalidation<T>(promise: Promise<T>): Promise<T> {
  return promise.then((response) => {
    invalidateDomainDataCache();
    return response;
  });
}

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

    if (response.status === 401 || response.status === 431 || isJwtSessionError(message)) {
      clearAuth();
    }

    if (response.status === 401 || isJwtSessionError(message)) {
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
  return getCachedJson<ProfileResponse>("profile", () => apiRequest<ProfileResponse>("/profile", { method: "GET" }, true));
}

export function updateProfile(payload: UpdateProfileRequest): Promise<UpdateProfileResponse> {
  return apiRequest<UpdateProfileResponse>(
    "/profile",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    true
  ).then((response) => {
    invalidateProfileDataCache();
    return response;
  });
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
  ).then((response) => {
    invalidateProfileDataCache();
    invalidateProfilePhotoCache();
    return response;
  });
}

export async function getProfilePhotoBlob(): Promise<Blob | null> {
  return getCachedProfilePhoto("profile-photo", async () => {
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

      if (response.status === 401 || response.status === 431 || isJwtSessionError(message)) {
        clearAuth();
      }

      if (response.status === 401 || isJwtSessionError(message)) {
        throw new Error("Session expired. Please login again.");
      }

      if (response.status === 431) {
        throw new Error("Request headers are too large. Your session was cleared. Please sign in again.");
      }

      throw new Error(message);
    }

    const blob = await response.blob();
    return blob.size > 0 ? blob : null;
  });
}

export interface LoanPenalty {
  penalty_id: string;
  loan_id: string;
  amount: number;
  reason: string | null;
  penalty_date: string;
  created_at: string;
}

export interface EntryPenalty {
  penalty_id: string;
  entry_id: string;
  amount: number;
  reason: string | null;
  penalty_date: string;
  created_at: string;
}

export interface PenaltyRequest {
  amount: number;
  reason?: string;
  penaltyDate: string;
}

export interface LoanPayment {
  payment_id: string;
  loan_id: string;
  amount: number;
  note: string | null;
  payment_date: string;
  proof_filename: string | null;
  proof_mime_type: string | null;
  is_archived: boolean;
  archive_reason: string | null;
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
  interest_rate: number;
  payment_frequency: "none" | "weekly" | "semimonthly" | "monthly" | "quarterly";
  penalty_rate: number;
  created_at: string;
  updated_at: string;
  loan_payments: LoanPayment[];
  loan_penalties: LoanPenalty[];
  remaining_balance: number;
  paid_amount: number;
  total_penalties: number;
}

export interface LoanRequest {
  borrowerName: string;
  amount: number;
  description?: string;
  dateLent: string;
  dueDate?: string;
  status?: string;
  interestRate?: number;
  paymentFrequency?: string;
  penaltyRate?: number;
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
  penalty_rate: number;
  created_at: string;
  updated_at: string;
  total_collected?: number;
  still_owed?: number;
  entry_penalties?: EntryPenalty[];
  total_penalties?: number;
}

export interface EntryRequest {
  debtor_id: string;
  original_amount: number;
  currency?: string;
  lending_date: string;
  expected_payback_date?: string;
  notes?: string;
  penaltyRate?: number;
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
  proof_filename: string | null;
  proof_mime_type: string | null;
  is_archived: boolean;
  archive_reason: string | null;
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
  return getCachedJson<Loan[]>("loans", () => apiRequest<Loan[]>("/loans", { method: "GET" }, true));
}

export function createLoan(payload: LoanRequest): Promise<Loan> {
  return withDomainCacheInvalidation(apiRequest<Loan>("/loans", { method: "POST", body: JSON.stringify(payload) }, true));
}

export function updateLoan(loanId: string, payload: LoanRequest): Promise<Loan> {
  return withDomainCacheInvalidation(apiRequest<Loan>(`/loans/${loanId}`, { method: "PUT", body: JSON.stringify(payload) }, true));
}

export function deleteLoan(loanId: string): Promise<void> {
  return withDomainCacheInvalidation(apiRequest<void>(`/loans/${loanId}`, { method: "DELETE" }, true));
}

export function addPayment(loanId: string, payload: LoanPaymentRequest): Promise<LoanPayment> {
  return withDomainCacheInvalidation(apiRequest<LoanPayment>(`/loans/${loanId}/payments`, { method: "POST", body: JSON.stringify(payload) }, true));
}

export function archivePayment(loanId: string, paymentId: string, reason?: string): Promise<void> {
  return withDomainCacheInvalidation(apiRequest<void>(`/loans/${loanId}/payments/${paymentId}/archive`, {
    method: "PATCH",
    body: JSON.stringify({ reason: reason ?? "" }),
  }, true));
}

export function uploadPaymentProof(loanId: string, paymentId: string, file: File): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  return withDomainCacheInvalidation(apiRequest<void>(`/loans/${loanId}/payments/${paymentId}/proof`, { method: "POST", body: form }, true));
}

export async function getPaymentProof(loanId: string, paymentId: string): Promise<Blob | null> {
  return fetchProofBlob(`/loans/${loanId}/payments/${paymentId}/proof`);
}

export function getDebtors(): Promise<Debtor[]> {
  return getCachedJson<Debtor[]>("debtors", () => apiRequest<Debtor[]>("/debtors", { method: "GET" }, true));
}

export function createDebtor(payload: DebtorRequest): Promise<Debtor> {
  return withDomainCacheInvalidation(apiRequest<Debtor>("/debtors", { method: "POST", body: JSON.stringify(payload) }, true));
}

export function updateDebtor(debtorId: string, payload: DebtorRequest): Promise<Debtor> {
  return withDomainCacheInvalidation(apiRequest<Debtor>(`/debtors/${debtorId}`, { method: "PUT", body: JSON.stringify(payload) }, true));
}

export function archiveDebtor(debtorId: string): Promise<void> {
  return withDomainCacheInvalidation(apiRequest<void>(`/debtors/${debtorId}`, { method: "DELETE" }, true));
}

export function getEntries(): Promise<Entry[]> {
  return getCachedJson<Entry[]>("entries", () => apiRequest<Entry[]>("/entries", { method: "GET" }, true));
}

export function createEntry(payload: EntryRequest): Promise<Entry> {
  return withDomainCacheInvalidation(apiRequest<Entry>("/entries", { method: "POST", body: JSON.stringify(payload) }, true));
}

export function updateEntry(entryId: string, payload: EntryRequest): Promise<Entry> {
  return withDomainCacheInvalidation(apiRequest<Entry>(`/entries/${entryId}`, { method: "PUT", body: JSON.stringify(payload) }, true));
}

export function archiveEntry(entryId: string): Promise<void> {
  return withDomainCacheInvalidation(apiRequest<void>(`/entries/${entryId}`, { method: "DELETE" }, true));
}

export function getEntryCollections(entryId: string): Promise<EntryCollection[]> {
  return apiRequest<EntryCollection[]>(`/entries/${entryId}/collections`, { method: "GET" }, true);
}

export function createCollection(entryId: string, payload: CollectionRequest): Promise<EntryCollection> {
  return withDomainCacheInvalidation(apiRequest<EntryCollection>(`/entries/${entryId}/collections`, { method: "POST", body: JSON.stringify(payload) }, true));
}

export function updateCollection(collectionId: string, payload: CollectionRequest): Promise<EntryCollection> {
  return withDomainCacheInvalidation(apiRequest<EntryCollection>(`/collections/${collectionId}`, { method: "PUT", body: JSON.stringify(payload) }, true));
}

export function archiveCollection(collectionId: string, reason?: string): Promise<void> {
  return withDomainCacheInvalidation(apiRequest<void>(`/collections/${collectionId}/archive`, {
    method: "PATCH",
    body: JSON.stringify({ reason: reason ?? "" }),
  }, true));
}

export function uploadCollectionProof(entryId: string, collectionId: string, file: File): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  return withDomainCacheInvalidation(apiRequest<void>(`/entries/${entryId}/collections/${collectionId}/proof`, { method: "POST", body: form }, true));
}

export async function getCollectionProof(entryId: string, collectionId: string): Promise<Blob | null> {
  return fetchProofBlob(`/entries/${entryId}/collections/${collectionId}/proof`);
}

export function deleteAllLoans(): Promise<void> {
  return withDomainCacheInvalidation(apiRequest<void>("/loans", { method: "DELETE" }, true));
}

export function deleteAllEntries(): Promise<void> {
  return withDomainCacheInvalidation(apiRequest<void>("/entries", { method: "DELETE" }, true));
}

export function uploadLoanProof(loanId: string, file: File): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  return withDomainCacheInvalidation(apiRequest<void>(`/loans/${loanId}/proof`, { method: "POST", body: form }, true));
}

export async function getLoanProof(loanId: string): Promise<Blob | null> {
  return fetchProofBlob(`/loans/${loanId}/proof`);
}

export function deleteLoanProof(loanId: string): Promise<void> {
  return withDomainCacheInvalidation(apiRequest<void>(`/loans/${loanId}/proof`, { method: "DELETE" }, true));
}

export function uploadEntryProof(entryId: string, file: File): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  return withDomainCacheInvalidation(apiRequest<void>(`/entries/${entryId}/proof`, { method: "POST", body: form }, true));
}

export async function getEntryProof(entryId: string): Promise<Blob | null> {
  return fetchProofBlob(`/entries/${entryId}/proof`);
}

export function deleteEntryProof(entryId: string): Promise<void> {
  return withDomainCacheInvalidation(apiRequest<void>(`/entries/${entryId}/proof`, { method: "DELETE" }, true));
}

export function addLoanPenalty(loanId: string, payload: PenaltyRequest): Promise<LoanPenalty> {
  return withDomainCacheInvalidation(apiRequest<LoanPenalty>(`/loans/${loanId}/penalties`, { method: "POST", body: JSON.stringify(payload) }, true));
}

export function addEntryPenalty(entryId: string, payload: PenaltyRequest): Promise<EntryPenalty> {
  return withDomainCacheInvalidation(apiRequest<EntryPenalty>(`/entries/${entryId}/penalties`, { method: "POST", body: JSON.stringify(payload) }, true));
}

async function fetchProofBlob(endpoint: string): Promise<Blob | null> {
  const token = getAccessToken();
  if (!token) {
    clearAuth();
    throw new Error("No access token found. Please login first.");
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    credentials: "omit",
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 401 || response.status === 403) {
      clearAuth();
      throw new Error("Session expired. Please login again.");
    }
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  const blob = await response.blob();
  return blob.size > 0 ? blob : null;
}