# API Endpoints (Supabase)

Base URL:

`http://localhost:8080/api`

## Authentication

For protected endpoints, send:

`Authorization: Bearer <access_token>`

Get `access_token` from the Login API.

---

## 1) Register API

- **Method:** `POST`
- **URL:** `/register`
- **Auth Required:** No
- **Content-Type:** `application/json`

### Request Body

```json
{
  "email": "user1@example.com",
  "password": "P@ssword123",
  "firstName": "User",
  "lastName": "One",
  "username": "userone",
  "birthday": "1998-04-15"
}
```

### Success Response (200)

```json
{
  "message": "User registered successfully",
  "user_id": "9f6f0f04-3b2f-4d17-a616-7df3f2f5b462",
  "email": "user1@example.com"
}
```

---

## 2) Login API

- **Method:** `POST`
- **URL:** `/login`
- **Auth Required:** No
- **Content-Type:** `application/json`

### Request Body

```json
{
  "email": "user1@example.com",
  "password": "P@ssword123"
}
```

### Success Response (200)

```json
{
  "message": "Login successful",
  "access_token": "<jwt_access_token>",
  "refresh_token": "<refresh_token>",
  "token_type": "bearer",
  "expires_in": 3600,
  "user_id": "9f6f0f04-3b2f-4d17-a616-7df3f2f5b462"
}
```

---

## 3) Profile API

- **Method:** `GET`
- **URL:** `/profile`
- **Auth Required:** Yes (`Bearer token`)

### Success Response (200)

```json
{
  "user_id": "9f6f0f04-3b2f-4d17-a616-7df3f2f5b462",
  "email": "user1@example.com",
  "first_name": "User",
  "last_name": "One",
  "username": "userone",
  "birthday": "1998-04-15",
  "phone": "+639999999999",
  "bio": "Hello from Supabase",
  "photo_filename": "profile.png",
  "photo_mime_type": "image/png",
  "created_at": "2026-02-26T00:00:00Z",
  "updated_at": "2026-02-26T00:00:00Z"
}
```

---

## 4) Edit Profile API

- **Method:** `PUT`
- **URL:** `/profile`
- **Auth Required:** Yes (`Bearer token`)
- **Content-Type:** `application/json`

### Request Body

```json
{
  "firstName": "Updated",
  "lastName": "User",
  "username": "updateduser",
  "birthday": "1998-04-15",
  "phone": "+639999999999",
  "bio": "Updated bio"
}
```

### Success Response (200)

```json
{
  "message": "Profile updated successfully",
  "profile": {
    "user_id": "9f6f0f04-3b2f-4d17-a616-7df3f2f5b462",
    "email": "user1@example.com",
    "first_name": "Updated",
    "last_name": "User",
    "username": "updateduser",
    "birthday": "1998-04-15",
    "phone": "+639999999999",
    "bio": "Updated bio",
    "photo_filename": "profile.png",
    "photo_mime_type": "image/png",
    "created_at": "2026-02-26T00:00:00Z",
    "updated_at": "2026-02-26T00:00:00Z"
  }
}
```

---

## 5) Edit Password API

- **Method:** `PUT`
- **URL:** `/profile/password`
- **Auth Required:** Yes (`Bearer token`)
- **Content-Type:** `application/json`

### Request Body

```json
{
  "newPassword": "NewStrongP@ss123"
}
```

### Success Response (200)

```json
{
  "message": "Password updated successfully"
}
```

---

## 6) Upload Photo API

- **Method:** `POST`
- **URL:** `/profile/photo`
- **Auth Required:** Yes (`Bearer token`)
- **Content-Type:** `multipart/form-data`
- **Form Field:** `file` (accepts `.jpg`, `.png`)

### Success Response (200)

```json
{
  "message": "Photo uploaded successfully",
  "file_reference": "9f6f0f04-3b2f-4d17-a616-7df3f2f5b462/profile.png",
  "size_bytes": 125430
}
```

---

## 7) Get Profile Photo API

- **Method:** `GET`
- **URL:** `/profile/photo`
- **Auth Required:** Yes (`Bearer token`)

### Success Response (200)

- Returns raw image bytes (`image/jpeg` or `image/png`).

### Not Found (404)

- Returned when no profile photo exists.

### Notes

- If the stored image bytes are invalid, backend automatically clears invalid photo fields in DB and returns `404`.

---

## Postman Screenshot Checklist

For each required screenshot, show:

1. Endpoint URL
2. HTTP method
3. Request body (or form-data for upload)
4. Response status (`200 OK`)
5. Returned JSON data
