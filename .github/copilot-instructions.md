# Project Guidelines

## Code Style
- Follow existing style per module instead of normalizing across the monorepo.
- Backend (`backend/`): Spring MVC controllers returning `Map<String, Object>` and `ResponseStatusException` patterns. Examples: `backend/src/main/java/com/example/loadbuddy/controller/AuthController.java`, `backend/src/main/java/com/example/loadbuddy/controller/ApiExceptionHandler.java`.
- Frontend (`frontend/`): React function components with TypeScript interfaces in `frontend/src/api.ts`, local page-state navigation in `frontend/src/App.tsx`, Tailwind utility classes.
- Mobile app (`mobile/app`): Kotlin Activities + `findViewById`, Retrofit callbacks, SharedPreferences session helpers. Examples: `mobile/app/src/main/java/com/example/loanbuddy/LoginActivity.kt`, `mobile/app/src/main/java/com/example/loanbuddy/AuthManager.kt`.
- Mobile backend (`mobile/backend`): DTO records + validation annotations (`@Valid`, `@NotBlank`, etc.). Examples: `mobile/backend/src/main/java/com/example/testapi/dto/RegisterRequest.java`.

## Architecture
- Monorepo contains two separate backend implementations:
  - Primary web API for React app: `backend/` (Maven).
  - Secondary backend module: `mobile/backend` (Gradle, Spring Boot).
- Main web flow: `frontend/src/api.ts` -> `backend` `/api/*` endpoints -> Supabase Auth/PostgREST.
- Mobile app currently talks directly to Supabase Auth endpoints via Retrofit (`mobile/app/src/main/java/com/example/loanbuddy/api/ApiService.kt`).
- DB shape and trigger behavior are controlled by Flyway migrations in `backend/src/main/resources/db/migration/`.

## Build and Test
- Backend run: `cd backend && .\mvnw.cmd spring-boot:run`
- Backend test: `cd backend && .\mvnw.cmd test`
- Backend package: `cd backend && .\mvnw.cmd clean package`
- Frontend install/start/build/test: `cd frontend && npm install && npm run start` / `npm run build` / `npm test`
- Mobile app build: `cd mobile && .\gradlew.bat :app:assembleDebug`
- Mobile app unit tests: `cd mobile && .\gradlew.bat :app:testDebugUnitTest`
- Mobile backend run/test: `cd mobile && .\gradlew.bat :backend:bootRun` / `:backend:test`

## Project Conventions
- Preserve API field naming as documented (`snake_case` response keys like `access_token`, `user_id`, `full_name`). Reference: `backend/ENDPOINTS.md`, `frontend/src/api.ts`.
- Keep frontend auth error behavior intact: token/session is cleared on `401/403/431` and JWT-session errors (`frontend/src/api.ts`, `frontend/src/auth.ts`).
- Keep CORS configuration property-driven (`APP_CORS_ALLOWED_ORIGINS`) and aligned with `backend/src/main/java/com/example/loadbuddy/config/CorsConfig.java`.
- Naming is intentionally inconsistent across modules (`loanbuddy`, `loadbuddy`, `testapi`); preserve local naming and package conventions when editing.

## Integration Points
- Frontend API base URL resolution uses `REACT_APP_API_BASE_URL` with dev fallback to `http://localhost:8080/api` (`frontend/src/api.ts`).
- Frontend dev proxy is `http://localhost:8080` (`frontend/package.json`).
- Backend uses Supabase endpoints for auth/profile operations through service classes:
  - `backend/src/main/java/com/example/loadbuddy/service/SupabaseAuthService.java`
  - `backend/src/main/java/com/example/loadbuddy/service/ProfileService.java`

## Security
- Do not introduce new hardcoded secrets; prefer environment variables.
- Existing files already contain sensitive defaults (Supabase URL/key/JDBC values):
  - `backend/src/main/resources/application.properties`
  - `mobile/backend/src/main/resources/application.properties`
  - `mobile/app/src/main/java/com/example/loanbuddy/api/RetrofitClient.kt`
- Avoid expanding token/PII logging; mobile currently logs full HTTP bodies via `HttpLoggingInterceptor.Level.BODY`.
- Authentication is bearer-token based and largely handled in controller/service code (not Spring Security filters), so preserve token extraction and validation flows when changing auth endpoints.
