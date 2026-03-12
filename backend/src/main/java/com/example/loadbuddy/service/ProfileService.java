package com.example.loadbuddy.service;

import com.example.loadbuddy.model.EditProfileRequest;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class ProfileService {

    private final String supabaseUrl;
    private final String anonKey;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public ProfileService(
            @Value("${supabase.url}") String supabaseUrl,
            @Value("${supabase.anon-key}") String anonKey,
            ObjectMapper objectMapper
    ) {
        this.supabaseUrl = supabaseUrl;
        this.anonKey = anonKey;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newHttpClient();
    }

    public Map<String, Object> getProfile(UUID userId, String accessToken) {
        try {
            JsonNode response = callRest(
                    "GET",
                    "/rest/v1/user_profiles?user_id=eq." + userId + "&select=user_id,email,full_name,phone,bio,photo_filename,photo_mime_type,created_at,updated_at",
                    null,
                    accessToken,
                    false
            );

            if (!response.isArray() || response.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found");
            }

            return objectMapper.convertValue(response.get(0), new TypeReference<>() {});
        } catch (ResponseStatusException exception) {
            if (isMissingTableError(exception)) {
                return getProfileFromAuthMetadata(accessToken);
            }
            throw exception;
        }
    }

    public Map<String, Object> updateProfile(UUID userId, EditProfileRequest request, String accessToken) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("full_name", request.getFullName());
        payload.put("phone", request.getPhone());
        payload.put("bio", request.getBio());

        try {
            JsonNode responseNode = callRest(
                    "PATCH",
                    "/rest/v1/user_profiles?user_id=eq." + userId + "&select=user_id,email,full_name,phone,bio,photo_filename,photo_mime_type,created_at,updated_at",
                    payload,
                    accessToken,
                    true
            );

            if (!responseNode.isArray() || responseNode.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found");
            }

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Profile updated successfully");
            response.put("profile", objectMapper.convertValue(responseNode.get(0), new TypeReference<>() {}));
            return response;
        } catch (ResponseStatusException exception) {
            if (!isMissingTableError(exception)) {
                throw exception;
            }

            updateAuthMetadata(accessToken, payload);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Profile updated successfully");
            response.put("profile", getProfileFromAuthMetadata(accessToken));
            return response;
        }
    }

    public Map<String, Object> uploadPhoto(UUID userId, MultipartFile file, String accessToken) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Photo file is required");
        }

        String contentType = file.getContentType();
        if (contentType == null ||
                (!contentType.equalsIgnoreCase("image/jpeg") && !contentType.equalsIgnoreCase("image/png"))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only .jpg and .png files are allowed");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to read image file");
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("photo", toHexBytea(bytes));
        payload.put("photo_filename", file.getOriginalFilename());
        payload.put("photo_mime_type", contentType);

        try {
            JsonNode responseNode = callRest(
                    "PATCH",
                    "/rest/v1/user_profiles?user_id=eq." + userId + "&select=user_id",
                    payload,
                    accessToken,
                    true
            );

            if (!responseNode.isArray() || responseNode.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found");
            }
        } catch (ResponseStatusException exception) {
            if (!isMissingTableError(exception)) {
                throw exception;
            }

            Map<String, Object> metadataPayload = new HashMap<>();
            metadataPayload.put("photo_filename", file.getOriginalFilename());
            metadataPayload.put("photo_mime_type", contentType);
            updateAuthMetadata(accessToken, metadataPayload);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Photo uploaded successfully");
        response.put("file_reference", userId + "/" + file.getOriginalFilename());
        response.put("size_bytes", bytes.length);
        return response;
    }

    private JsonNode callRest(String method, String path, Object payload, String accessToken, boolean returnRepresentation) {
        validateConfig();

        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create(supabaseUrl + path))
                    .header("apikey", anonKey)
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json");

            if (returnRepresentation) {
                builder.header("Prefer", "return=representation");
            }

            if ("GET".equalsIgnoreCase(method)) {
                builder.GET();
            } else {
                String json = payload == null ? "{}" : objectMapper.writeValueAsString(payload);
                builder.method(method, HttpRequest.BodyPublishers.ofString(json));
            }

            HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String message = extractMessage(response.body());
                if (isJwtAuthError(response.statusCode(), message)) {
                    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session expired. Please login again.");
                }
                throw new ResponseStatusException(mapHttpStatus(response.statusCode()), message);
            }

            String body = response.body();
            if (body == null || body.isBlank()) {
                return objectMapper.createArrayNode();
            }
            return objectMapper.readTree(body);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Supabase REST request interrupted");
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Supabase REST request failed: " + exception.getMessage());
        }
    }

    private void validateConfig() {
        if (supabaseUrl == null || supabaseUrl.isBlank() || anonKey == null || anonKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Supabase REST configuration is missing");
        }
    }

    private String extractMessage(String body) {
        try {
            JsonNode node = objectMapper.readTree(body);
            if (node.has("message")) {
                return node.get("message").asText();
            }
            if (node.has("error_description")) {
                return node.get("error_description").asText();
            }
        } catch (Exception ignored) {
        }
        return "Supabase REST operation failed";
    }

    private String toHexBytea(byte[] bytes) {
        StringBuilder sb = new StringBuilder("\\x");
        for (byte value : bytes) {
            sb.append(String.format("%02x", value));
        }
        return sb.toString();
    }

    private boolean isMissingTableError(ResponseStatusException exception) {
        String message = exception.getReason();
        if (message == null) {
            return false;
        }
        String normalized = message.toLowerCase();
        return normalized.contains("could not find the table") || normalized.contains("schema cache");
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

    private HttpStatus mapHttpStatus(int statusCode) {
        try {
            return HttpStatus.valueOf(statusCode);
        } catch (Exception ignored) {
            return HttpStatus.BAD_GATEWAY;
        }
    }

    private Map<String, Object> getProfileFromAuthMetadata(String accessToken) {
        JsonNode user = callAuthUser("GET", null, accessToken);
        JsonNode metadata = user.path("user_metadata");

        Map<String, Object> profile = new HashMap<>();
        profile.put("user_id", user.path("id").asText(""));
        profile.put("email", user.path("email").asText(""));
        profile.put("full_name", metadata.path("full_name").asText(""));
        profile.put("phone", metadata.path("phone").asText(""));
        profile.put("bio", metadata.path("bio").asText(""));
        profile.put("photo_filename", metadata.path("photo_filename").asText(""));
        profile.put("photo_mime_type", metadata.path("photo_mime_type").asText(""));
        profile.put("created_at", user.path("created_at").asText(""));
        profile.put("updated_at", user.path("updated_at").asText(""));
        return profile;
    }

    private void updateAuthMetadata(String accessToken, Map<String, Object> metadata) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("data", metadata);
        callAuthUser("PUT", payload, accessToken);
    }

    private JsonNode callAuthUser(String method, Object payload, String accessToken) {
        validateConfig();

        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create(supabaseUrl + "/auth/v1/user"))
                    .header("apikey", anonKey)
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json");

            if ("GET".equalsIgnoreCase(method)) {
                builder.GET();
            } else {
                String json = payload == null ? "{}" : objectMapper.writeValueAsString(payload);
                builder.method(method, HttpRequest.BodyPublishers.ofString(json));
            }

            HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String message = extractMessage(response.body());
                if (isJwtAuthError(response.statusCode(), message)) {
                    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session expired. Please login again.");
                }
                throw new ResponseStatusException(mapHttpStatus(response.statusCode()), message);
            }

            if (response.body() == null || response.body().isBlank()) {
                return objectMapper.createObjectNode();
            }
            return objectMapper.readTree(response.body());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Supabase Auth request interrupted");
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Supabase Auth request failed: " + exception.getMessage());
        }
    }
}
