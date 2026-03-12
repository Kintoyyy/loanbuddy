package com.example.testapi.service;

import com.example.testapi.config.SupabaseProperties;
import com.example.testapi.dto.LoginRequest;
import com.example.testapi.dto.LoginResponse;
import com.example.testapi.dto.RegisterRequest;
import com.example.testapi.dto.RegisterResponse;
import com.example.testapi.exception.ApiException;
import com.example.testapi.model.AuthenticatedUser;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class SupabaseService {

    private final WebClient webClient;
    private final SupabaseProperties properties;

    public SupabaseService(WebClient webClient, SupabaseProperties properties) {
        this.webClient = webClient;
        this.properties = properties;
    }

    public RegisterResponse register(RegisterRequest request) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("email", request.email());
        payload.put("password", request.password());
        payload.put("data", Map.of("full_name", request.fullName()));

        Map<String, Object> response = post("/auth/v1/signup", payload, null);
        Map<String, Object> user = map(response.get("user"));

        String userId = getString(user.get("id"));
        String email = getString(user.get("email"));
        if (userId == null || email == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "User registration failed");
        }

        return new RegisterResponse("User registered successfully", userId, email);
    }

    public LoginResponse login(LoginRequest request) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("email", request.email());
        payload.put("password", request.password());

        Map<String, Object> response = post("/auth/v1/token?grant_type=password", payload, null);
        Map<String, Object> user = map(response.get("user"));

        return new LoginResponse(
                "Login successful",
                getString(response.get("access_token")),
                getString(response.get("refresh_token")),
                getString(response.get("token_type")),
                getInteger(response.get("expires_in")),
                getString(user.get("id"))
        );
    }

    public AuthenticatedUser authenticate(String bearerToken) {
        Map<String, Object> user = get("/auth/v1/user", bearerToken);
        String id = getString(user.get("id"));
        String email = getString(user.get("email"));

        if (id == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid access token");
        }

        String fullName = null;
        Map<String, Object> userMetadata = map(user.get("user_metadata"));
        if (userMetadata != null) {
            fullName = getString(userMetadata.get("full_name"));
        }

        return new AuthenticatedUser(UUID.fromString(id), email, fullName, bearerToken);
    }

    public void updatePassword(String bearerToken, String newPassword) {
        Map<String, Object> payload = Map.of("password", newPassword);
        put("/auth/v1/user", payload, bearerToken);
    }

    public String uploadProfilePhoto(String bearerToken, UUID userId, MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid file name");
        }

        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equalsIgnoreCase("image/png") && !contentType.equalsIgnoreCase("image/jpeg"))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only .jpg and .png are allowed");
        }

        String sanitized = originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        String path = userId + "/" + sanitized;

        try {
            webClient.post()
                    .uri(properties.getUrl() + "/storage/v1/object/" + properties.getStorageBucket() + "/" + path)
                    .header("apikey", properties.getAnonKey())
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + bearerToken)
                    .header("x-upsert", "true")
                    .contentType(MediaType.parseMediaType(contentType))
                    .bodyValue(new ByteArrayResource(file.getBytes()))
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Photo upload failed");
        }

        return path;
    }

    private Map<String, Object> post(String path, Object payload, String bearerToken) {
        try {
            return webClient.post()
                    .uri(properties.getUrl() + path)
                    .header("apikey", properties.getAnonKey())
                    .headers(headers -> {
                        if (bearerToken != null) {
                            headers.set(HttpHeaders.AUTHORIZATION, "Bearer " + bearerToken);
                        }
                    })
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Supabase request failed");
        }
    }

    private Map<String, Object> put(String path, Object payload, String bearerToken) {
        try {
            return webClient.put()
                    .uri(properties.getUrl() + path)
                    .header("apikey", properties.getAnonKey())
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + bearerToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Password update failed");
        }
    }

    private Map<String, Object> get(String path, String bearerToken) {
        try {
            return webClient.get()
                    .uri(properties.getUrl() + path)
                    .header("apikey", properties.getAnonKey())
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + bearerToken)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid access token");
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> map(Object source) {
        if (source == null) {
            return null;
        }
        if (source instanceof Map<?, ?> raw) {
            return (Map<String, Object>) raw;
        }
        return null;
    }

    private String getString(Object value) {
        return value == null ? null : value.toString();
    }

    private Integer getInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        return Integer.parseInt(value.toString());
    }
}
