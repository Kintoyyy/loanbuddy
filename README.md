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

## Docker / Cloudflare Tunnel

- Centralized environment: copy `./.env.example` to `./.env` and fill in your values. Docker Compose will pick up variables from the repository root `.env` so all services use the same settings.
- Cloudflare Tunnel: a `cloudflared` service is included in `docker-compose.yml`. To use your domain:
	1. Copy `cloudflared/config.yml.example` to `cloudflared/config.yml` and update hostnames to match your domain(s).
	2. Obtain a tunnel token from Cloudflare (Zero Trust / `cloudflared tunnel` docs) and set `CLOUDFLARE_TUNNEL_TOKEN` in `./.env`.
	3. Start the stack:

```powershell
# start cloudflared and services
docker compose up -d cloudflared
docker compose up -d
```

Notes:
- Do not commit `./.env` with real secrets. Use `./.env.example` as a template.
- If you want DNS-managed routing, register a tunnel via the `cloudflared` CLI and create DNS records for your hostname(s).

The `cloudflared` service mounts `./cloudflared/config.yml` automatically, so ingress rules in that file are applied when the tunnel starts.

Mobile backend service

- The repository includes a `mobile/backend` Spring Boot module; a Dockerfile and `mobile_backend` service are added to `docker-compose.yml`. The service builds the module and exposes it on `8081` by default (mapable via `MOBILE_BACKEND_PORT`).
- To run the mobile backend via Docker Compose:

```powershell
# ensure .env contains SUPABASE_* values and MOBILE_BACKEND_PORT if you changed it
docker compose up -d mobile_backend
```

Notes:
- The `mobile_backend` image uses a Gradle multi-stage build. The first build step runs Gradle inside the builder image, so the host does not need Gradle installed.
- If the build fails due to environment-specific issues, you can build locally with Gradle and then run the produced jar in a simple JVM image.

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