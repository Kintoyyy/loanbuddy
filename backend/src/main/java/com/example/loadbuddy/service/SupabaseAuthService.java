package com.example.loadbuddy.service;

import com.example.loadbuddy.model.LoginRequest;
import com.example.loadbuddy.model.RegisterRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class SupabaseAuthService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$");

    private final String supabaseUrl;
    private final String anonKey;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public SupabaseAuthService(
            @Value("${supabase.url:https://tegmrwethihhgwwamqxl.supabase.co}") String supabaseUrl,
            @Value("${supabase.anon-key:}") String anonKey,
            ObjectMapper objectMapper
    ) {
        this.supabaseUrl = supabaseUrl;
        this.anonKey = anonKey;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newHttpClient();
    }

    public Map<String, Object> register(RegisterRequest request) {
        validateAuthConfiguration();
        String email = normalizeEmail(request.getEmail());
        validatePassword(request.getPassword());

        Map<String, Object> payload = new HashMap<>();
        payload.put("email", email);
        payload.put("password", request.getPassword());

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("full_name", request.getFullName());
        payload.put("data", metadata);

        JsonNode body = callSupabase("/auth/v1/signup", "POST", payload, anonKey);
        JsonNode userNode = body.path("user");

        Map<String, Object> response = new HashMap<>();
        response.put("message", "User registered successfully");
        response.put("user_id", userNode.path("id").asText());
        response.put("email", userNode.path("email").asText());
        return response;
    }

    public Map<String, Object> login(LoginRequest request) {
        validateAuthConfiguration();
        String email = normalizeEmail(request.getEmail());
        validatePassword(request.getPassword());

        Map<String, Object> payload = new HashMap<>();
        payload.put("email", email);
        payload.put("password", request.getPassword());

        JsonNode body = callSupabase("/auth/v1/token?grant_type=password", "POST", payload, anonKey);
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

    private JsonNode removeOversizedAuthMetadata(JsonNode loginBody, Map<String, Object> loginPayload) {
        JsonNode metadataNode = loginBody.path("user").path("user_metadata");
        if (!metadataNode.isObject() || !metadataNode.has("photo_base64")) {
            return loginBody;
        }

        Map<String, Object> sanitizedMetadata = objectMapper.convertValue(metadataNode, new TypeReference<>() {});
        sanitizedMetadata.remove("photo_base64");

        String accessToken = loginBody.path("access_token").asText();
        if (accessToken == null || accessToken.isBlank()) {
            return loginBody;
        }

        Map<String, Object> updatePayload = new HashMap<>();
        updatePayload.put("data", sanitizedMetadata);
        callSupabase("/auth/v1/user", "PUT", updatePayload, accessToken);

        return callSupabase("/auth/v1/token?grant_type=password", "POST", loginPayload, anonKey);
    }

    public String getAuthenticatedUserId(String accessToken) {
        validateAuthConfiguration();

        JsonNode body = callSupabase("/auth/v1/user", "GET", null, accessToken);
        String userId = body.path("id").asText();
        if (userId == null || userId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid access token");
        }

        return userId;
    }

    public void updatePassword(String accessToken, String newPassword) {
        validateAuthConfiguration();
        validatePassword(newPassword);

        Map<String, Object> payload = new HashMap<>();
        payload.put("password", newPassword);
        callSupabase("/auth/v1/user", "PUT", payload, accessToken);
    }

    private void validateAuthConfiguration() {
        if (anonKey == null || anonKey.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Supabase anon key is not configured. Set SUPABASE_ANON_KEY."
            );
        }
    }

    private JsonNode callSupabase(String path, String method, Object payload, String bearerToken) {
        try {
            String resolvedBearerToken = (bearerToken == null || bearerToken.isBlank()) ? anonKey : bearerToken;
            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(supabaseUrl + path))
                    .header("apikey", anonKey)
                    .header("Authorization", "Bearer " + resolvedBearerToken)
                    .header("Content-Type", "application/json");

            if ("GET".equalsIgnoreCase(method)) {
                requestBuilder.GET();
            } else {
                String body = payload == null ? "{}" : objectMapper.writeValueAsString(payload);
                requestBuilder.method(method, HttpRequest.BodyPublishers.ofString(body));
            }

            HttpResponse<String> response = httpClient.send(
                    requestBuilder.build(),
                    HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String message = extractErrorMessage(response.body());
                if (isJwtAuthError(response.statusCode(), message)) {
                    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session expired. Please login again.");
                }
                if (isRateLimitMessage(message)) {
                    throw new ResponseStatusException(
                            HttpStatus.TOO_MANY_REQUESTS,
                            "Email rate limit exceeded. Please wait and retry."
                    );
                }
                throw new ResponseStatusException(mapHttpStatus(response.statusCode()), message);
            }

            if (response.body() == null || response.body().isBlank()) {
                return objectMapper.createObjectNode();
            }

            return objectMapper.readTree(response.body());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Supabase request interrupted"
            );
        } catch (IOException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Supabase request failed: " + exception.getMessage()
            );
        }
    }

    private String extractErrorMessage(String responseBody) {
        try {
            JsonNode error = objectMapper.readTree(responseBody);
            if (error.has("msg")) {
                return error.get("msg").asText();
            }
            if (error.has("error_description")) {
                return error.get("error_description").asText();
            }
            if (error.has("message")) {
                return error.get("message").asText();
            }
        } catch (Exception ignored) {
        }

        return "Supabase request failed";
    }

    private HttpStatus mapHttpStatus(int statusCode) {
        try {
            return HttpStatus.valueOf(statusCode);
        } catch (Exception ignored) {
            return HttpStatus.BAD_REQUEST;
        }
    }

    private boolean isRateLimitMessage(String message) {
        return message != null && message.toLowerCase().contains("rate limit exceeded");
    }

    private boolean isJwtAuthError(int statusCode, String message) {
        if (message == null) {
            return statusCode == HttpStatus.UNAUTHORIZED.value();
        }

        String normalizedMessage = message.toLowerCase();
        return statusCode == HttpStatus.UNAUTHORIZED.value()
                || statusCode == HttpStatus.FORBIDDEN.value()
                || normalizedMessage.contains("invalid jwt")
                || normalizedMessage.contains("token is expired")
                || normalizedMessage.contains("invalid access token");
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
