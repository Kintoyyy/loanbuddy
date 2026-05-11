# LoanBuddy

LoanBuddy is a multi-platform project with:
- a **Spring Boot backend API** (`backend/`),
- a **React + TypeScript web frontend** (`frontend/`),
- an **Android mobile app** (`mobile/app`),
- and an additional **Spring Boot backend module for mobile workspace** (`mobile/backend`).

## Project Structure

```text
loanbuddy/
├─ backend/        # Main Spring Boot API (Maven)
├─ frontend/       # React web app (CRA + TypeScript)
└─ mobile/         # Android app + Gradle backend module
```

## Tech Stack

- **Backend:** Java 17, Spring Boot, JDBC, Flyway, PostgreSQL
- **Frontend:** React 19, TypeScript, Tailwind CSS, CRACO
- **Mobile:** Android (Kotlin), Retrofit, OkHttp
- **Auth/Data:** Supabase (Auth + Postgres)

## Prerequisites

Install the following before running locally:

- **Java 17**
- **Node.js 18+** and npm
- **Android Studio** (for mobile app)
- **Android SDK 34** (for mobile app)

## Quick Start

### 1) Backend (`backend/`)

```powershell
cd backend
./mvnw.cmd spring-boot:run
```

- Default local API base URL: `http://localhost:8080/api`
- Detailed endpoint documentation: `backend/ENDPOINTS.md`

### 2) Frontend (`frontend/`)

```powershell
cd frontend
npm install
npm run start
```

- Frontend runs on `http://localhost:3000`
- In development, API calls default to `http://localhost:8080/api`

### 3) Mobile App (`mobile/app`)

Open `mobile/` in Android Studio and run the `app` module on an emulator/device.

Optional CLI build:

```powershell
cd mobile
./gradlew.bat :app:assembleDebug
```

## Environment Configuration

### Backend (`backend/src/main/resources/application.properties`)

The backend reads these env vars (with defaults currently set in the repo):

- `SUPABASE_DB_JDBC_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `APP_CORS_ALLOWED_ORIGINS` (default: `http://localhost:3000`)

### Frontend (`frontend/src/api.ts`)

You can override API base URL with:

- `REACT_APP_API_BASE_URL`

Examples:
- `REACT_APP_API_BASE_URL=/api`
- `REACT_APP_API_BASE_URL=http://localhost:8080/api`

## API Summary

Main backend controller exposes:

- `POST /api/register`
- `POST /api/login`
- `GET /api/profile` (Bearer token required)
- `PUT /api/profile` (Bearer token required)
- `PUT /api/profile/password` (Bearer token required)
- `POST /api/profile/photo` (Bearer token required, multipart file upload)

For sample requests and responses, see `backend/ENDPOINTS.md`.

## Tests

### Backend tests

```powershell
cd backend
./mvnw.cmd test
```

### Frontend tests

```powershell
cd frontend
npm test
```

### Mobile tests

```powershell
cd mobile
./gradlew.bat test
```

## Notes

- This repository currently contains default Supabase values in config files. For production or shared environments, move secrets/URLs to environment variables or secure config.
- There are two backend codebases (`backend/` and `mobile/backend/`). The primary web API for the React app is in `backend/`.


docker compose build
docker compose up