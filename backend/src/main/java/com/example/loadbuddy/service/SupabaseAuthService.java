package com.example.loadbuddy.service;

import com.example.loadbuddy.model.LoginRequest;
import com.example.loadbuddy.model.RegisterRequest;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class SupabaseAuthService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$");
    private static final int MAX_ACCESS_TOKEN_LENGTH = 16 * 1024;
        private static final int MAX_METADATA_TEXT_LENGTH = 2048;
        private static final Set<String> SAFE_METADATA_KEYS = Set.of(
            "full_name",
            "phone",
            "bio",
            "photo_filename",
            "photo_mime_type"
        );

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
        body = enforceReasonableAccessToken(body, payload);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Login successful");
        response.put("access_token", body.path("access_token").asText());
        response.put("refresh_token", body.path("refresh_token").asText());
        response.put("token_type", body.path("token_type").asText());
        response.put("expires_in", body.path("expires_in").asInt());
        response.put("user_id", body.path("user").path("id").asText());
        return response;
    }

    private JsonNode enforceReasonableAccessToken(JsonNode loginBody, Map<String, Object> loginPayload) {
        String accessToken = loginBody.path("access_token").asText("");
        if (!accessToken.isBlank() && accessToken.length() <= MAX_ACCESS_TOKEN_LENGTH) {
            return loginBody;
        }

        JsonNode cleanedBody = removeOversizedAuthMetadata(loginBody, loginPayload, accessToken);
        String cleanedAccessToken = cleanedBody.path("access_token").asText("");

        if (!cleanedAccessToken.isBlank() && cleanedAccessToken.length() <= MAX_ACCESS_TOKEN_LENGTH) {
            return cleanedBody;
        }

        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Session token is too large. Please remove oversized profile metadata and login again."
        );
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

    private JsonNode removeOversizedAuthMetadata(JsonNode loginBody, Map<String, Object> loginPayload, String accessToken) {
        JsonNode metadataNode = loginBody.path("user").path("user_metadata");
        if (!metadataNode.isObject()) {
            return loginBody;
        }

        String userId = loginBody.path("user").path("id").asText();
        if (userId == null || userId.isBlank()) {
            return loginBody;
        }

        try {
            Map<String, Object> sanitizedMetadata = sanitizeUserMetadata(metadataNode);

            if (supabaseClient.hasServiceRoleKey()) {
                supabaseClient.callAuthAdmin("/auth/v1/admin/users/" + userId, "PUT", Map.of("user_metadata", sanitizedMetadata));
            } else if (accessToken != null && !accessToken.isBlank()) {
                supabaseClient.callAuth("/auth/v1/user", "PUT", Map.of("data", sanitizedMetadata), accessToken);
            } else {
                return loginBody;
            }

            return supabaseClient.callAuth("/auth/v1/token?grant_type=password", "POST", loginPayload, null);
        } catch (ResponseStatusException exception) {
            return loginBody;
        }
    }

    private Map<String, Object> sanitizeUserMetadata(JsonNode metadataNode) {
        Map<String, Object> sanitized = new HashMap<>();
        Iterator<Map.Entry<String, JsonNode>> fields = metadataNode.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> field = fields.next();
            String key = field.getKey();
            JsonNode value = field.getValue();

            if (!SAFE_METADATA_KEYS.contains(key) || value == null || value.isNull()) {
                continue;
            }

            if (value.isTextual()) {
                String text = value.asText("");
                if (!text.isBlank() && text.length() <= MAX_METADATA_TEXT_LENGTH) {
                    sanitized.put(key, text);
                }
                continue;
            }

            if (value.isNumber()) {
                sanitized.put(key, value.numberValue());
                continue;
            }

            if (value.isBoolean()) {
                sanitized.put(key, value.booleanValue());
            }
        }
        return sanitized;
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
