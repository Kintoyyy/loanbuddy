package com.example.loadbuddy.service;

import com.example.loadbuddy.model.EditProfileRequest;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class ProfileService {

    private final SupabaseClient supabaseClient;
    private final ObjectMapper objectMapper;

    public ProfileService(SupabaseClient supabaseClient, ObjectMapper objectMapper) {
        this.supabaseClient = supabaseClient;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> getProfile(UUID userId, String accessToken) {
        try {
            JsonNode response = supabaseClient.callRest(
                    "/rest/v1/user_profiles?user_id=eq." + userId + "&select=user_id,email,full_name,phone,bio,photo_filename,photo_mime_type,created_at,updated_at",
                    "GET", null, accessToken, false
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
            JsonNode responseNode = supabaseClient.callRest(
                    "/rest/v1/user_profiles?user_id=eq." + userId + "&select=user_id,email,full_name,phone,bio,photo_filename,photo_mime_type,created_at,updated_at",
                    "PATCH", payload, accessToken, true
            );

            if (!responseNode.isArray() || responseNode.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found");
            }

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Profile updated successfully");
            response.put("profile", objectMapper.convertValue(responseNode.get(0), new TypeReference<>() {}));
            return response;
        } catch (ResponseStatusException exception) {
            if (!isMissingTableError(exception)) throw exception;
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
            JsonNode responseNode = supabaseClient.callRest(
                    "/rest/v1/user_profiles?user_id=eq." + userId + "&select=user_id",
                    "PATCH", payload, accessToken, true
            );

            if (!responseNode.isArray() || responseNode.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found");
            }
        } catch (ResponseStatusException exception) {
            if (!isMissingTableError(exception)) throw exception;
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

    private Map<String, Object> getProfileFromAuthMetadata(String accessToken) {
        JsonNode user = supabaseClient.callAuth("/auth/v1/user", "GET", null, accessToken);
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
        supabaseClient.callAuth("/auth/v1/user", "PUT", Map.of("data", metadata), accessToken);
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
        if (message == null) return false;
        String normalized = message.toLowerCase();
        return normalized.contains("could not find the table") || normalized.contains("schema cache");
    }
}
