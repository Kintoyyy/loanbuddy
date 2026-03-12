package com.example.loadbuddy.service;

import com.example.loadbuddy.model.LoginRequest;
import com.example.loadbuddy.model.RegisterRequest;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class SupabaseAuthService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$");

    private final SupabaseClient supabaseClient;

    public SupabaseAuthService(SupabaseClient supabaseClient) {
        this.supabaseClient = supabaseClient;
    }

    public Map<String, Object> register(RegisterRequest request) {
        String email = normalizeEmail(request.getEmail());
        validatePassword(request.getPassword());

        Map<String, Object> payload = new HashMap<>();
        payload.put("email", email);
        payload.put("password", request.getPassword());
        payload.put("data", Map.of("full_name", request.getFullName()));

        JsonNode body = supabaseClient.callAuth("/auth/v1/signup", "POST", payload, null);
        JsonNode userNode = body.path("user");

        Map<String, Object> response = new HashMap<>();
        response.put("message", "User registered successfully");
        response.put("user_id", userNode.path("id").asText());
        response.put("email", userNode.path("email").asText());
        return response;
    }

    public Map<String, Object> login(LoginRequest request) {
        String email = normalizeEmail(request.getEmail());
        validatePassword(request.getPassword());

        Map<String, Object> payload = new HashMap<>();
        payload.put("email", email);
        payload.put("password", request.getPassword());

        JsonNode body = supabaseClient.callAuth("/auth/v1/token?grant_type=password", "POST", payload, null);
        body = removeOversizedAuthMetadata(body, payload);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Login successful");
        response.put("access_token", body.path("access_token").asText());
        response.put("refresh_token", body.path("refresh_token").asText());
        response.put("token_type", body.path("token_type").asText());
        response.put("expires_in", body.path("expires_in").asInt());
        response.put("user_id", body.path("user").path("id").asText());
        return response;
    }

    public String getAuthenticatedUserId(String accessToken) {
        JsonNode body = supabaseClient.callAuth("/auth/v1/user", "GET", null, accessToken);
        String userId = body.path("id").asText();
        if (userId == null || userId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid access token");
        }
        return userId;
    }

    public void updatePassword(String accessToken, String newPassword) {
        validatePassword(newPassword);
        supabaseClient.callAuth("/auth/v1/user", "PUT", Map.of("password", newPassword), accessToken);
    }

    private JsonNode removeOversizedAuthMetadata(JsonNode loginBody, Map<String, Object> loginPayload) {
        JsonNode metadataNode = loginBody.path("user").path("user_metadata");
        if (!metadataNode.isObject() || !metadataNode.has("photo_base64")) {
            return loginBody;
        }

        String userId = loginBody.path("user").path("id").asText();
        if (userId == null || userId.isBlank() || !supabaseClient.hasServiceRoleKey()) {
            // Cannot clean up without admin access — return login body as-is
            return loginBody;
        }

        // Use the Admin API so we avoid sending the oversized access token as a header
        Map<String, Object> nullPatch = new HashMap<>();
        nullPatch.put("photo_base64", null);
        supabaseClient.callAuthAdmin("/auth/v1/admin/users/" + userId, "PUT", Map.of("user_metadata", nullPatch));
        return supabaseClient.callAuth("/auth/v1/token?grant_type=password", "POST", loginPayload, null);
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }

        String normalized = email.trim();
        if (normalized.startsWith("\"") && normalized.endsWith("\"") && normalized.length() >= 2) {
            normalized = normalized.substring(1, normalized.length() - 1);
        }
        normalized = normalized.trim().toLowerCase();

        if (!EMAIL_PATTERN.matcher(normalized).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid email format");
        }

        return normalized;
    }

    private void validatePassword(String password) {
        if (password == null || password.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required");
        }
    }
}
