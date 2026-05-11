package com.example.loadbuddy.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

@Service
public class SupabaseClient {

    private static final Logger LOGGER = LoggerFactory.getLogger(SupabaseClient.class);

    private final String supabaseUrl;
    private final String anonKey;
    private final String serviceRoleKey;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public SupabaseClient(
            @Value("${supabase.url}") String supabaseUrl,
            @Value("${supabase.anon-key}") String anonKey,
            @Value("${supabase.service-role-key:}") String serviceRoleKey,
            ObjectMapper objectMapper
    ) {
        this.supabaseUrl = supabaseUrl;
        this.anonKey = anonKey;
        this.serviceRoleKey = serviceRoleKey;
        this.objectMapper = objectMapper;
        // Force HTTP/1.1 to avoid HTTP/2 GOAWAY frames from Supabase
        this.httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .build();

        if (!hasServiceRoleKey()) {
            LOGGER.warn("SUPABASE_SERVICE_ROLE_KEY is not configured. Automatic oversized metadata cleanup may fail for some users.");
        }
    }

    public boolean hasServiceRoleKey() {
        return serviceRoleKey != null && !serviceRoleKey.isBlank();
    }

    /**
     * Returns the service role key if available, otherwise null.
     * Used for backend operations that need to bypass RLS policies.
     */
    public String getServiceRoleKey() {
        return serviceRoleKey;
    }

    /**
     * Returns the service role key if available, otherwise returns the provided access token.
     * Useful for operations where service role has priority but user token is a fallback.
     */
    public String getServiceRoleKeyOrAccessToken(String fallbackAccessToken) {
        if (hasServiceRoleKey()) {
            return serviceRoleKey;
        }
        return fallbackAccessToken;
    }

    /**
     * Calls the Supabase Auth API (/auth/v1/*).
     * If bearerToken is null or blank, falls back to the anon key.
     */
    public JsonNode callAuth(String path, String method, Object payload, String bearerToken) {
        String token = (bearerToken == null || bearerToken.isBlank()) ? anonKey : bearerToken;
        return execute(supabaseUrl + path, method, payload, token, false);
    }

    /**
     * Calls the Supabase Admin Auth API using the service_role key.
     * Required for operations that need admin privileges (e.g. updating any user's metadata).
     */
    public JsonNode callAuthAdmin(String path, String method, Object payload) {
        if (!hasServiceRoleKey()) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Supabase service role key is not configured. Set SUPABASE_SERVICE_ROLE_KEY."
            );
        }
        return execute(supabaseUrl + path, method, payload, serviceRoleKey, false);
    }

    /**
     * Calls the Supabase REST API (/rest/v1/*).
     */
    public JsonNode callRest(String path, String method, Object payload, String accessToken, boolean returnRepresentation) {
        return execute(supabaseUrl + path, method, payload, accessToken, returnRepresentation);
    }

    public void uploadStorageObject(String bucket, String objectPath, byte[] bytes, String contentType, String bearerToken, boolean upsert) {
        String token = resolveToken(bearerToken);
        uploadStorageObjectInternal(bucket, objectPath, bytes, contentType, token, upsert);
    }

    private void uploadStorageObjectInternal(String bucket, String objectPath, byte[] bytes, String contentType, String token, boolean upsert) {
        String encodedPath = encodeObjectPath(objectPath);
        String url = supabaseUrl + "/storage/v1/object/" + bucket + "/" + encodedPath;

        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("apikey", anonKey)
                    .header("Authorization", "Bearer " + token)
                    .header("Content-Type", contentType)
                    .header("x-upsert", String.valueOf(upsert))
                    .POST(HttpRequest.BodyPublishers.ofByteArray(bytes));

            HttpResponse<byte[]> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofByteArray());
            handleStorageError(response);
        } catch (ResponseStatusException exception) {
            // If the user's token fails due to RLS violation, retry with service role key
            if (hasServiceRoleKey() && isRlsViolation(exception)) {
                LOGGER.debug("User token storage upload failed due to RLS, retrying with service role key");
                try {
                    uploadStorageObjectInternal(bucket, objectPath, bytes, contentType, serviceRoleKey, upsert);
                    return;
                } catch (ResponseStatusException retryException) {
                    // If service role key also fails, throw the original error
                    throw exception;
                }
            }
            throw exception;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Supabase request interrupted");
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Unable to reach Supabase storage service. Please try again.");
        }
    }

    private boolean isRlsViolation(ResponseStatusException exception) {
        String reason = exception.getReason();
        if (reason == null) return false;
        String reasonLower = reason.toLowerCase();
        return reasonLower.contains("row-level security") 
            || reasonLower.contains("rls")
            || reasonLower.contains("violates");
    }

    public byte[] downloadStorageObject(String bucket, String objectPath, String bearerToken) {
        String token = resolveToken(bearerToken);
        return downloadStorageObjectInternal(bucket, objectPath, token);
    }

    private byte[] downloadStorageObjectInternal(String bucket, String objectPath, String token) {
        String encodedPath = encodeObjectPath(objectPath);
        String url = supabaseUrl + "/storage/v1/object/" + bucket + "/" + encodedPath;

        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("apikey", anonKey)
                    .header("Authorization", "Bearer " + token)
                    .header("Accept", "*/*")
                    .GET();

            HttpResponse<byte[]> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofByteArray());
            handleStorageError(response);
            return response.body();
        } catch (ResponseStatusException exception) {
            // If the user's token fails due to RLS violation, retry with service role key
            if (hasServiceRoleKey() && isRlsViolation(exception)) {
                LOGGER.debug("User token storage download failed due to RLS, retrying with service role key");
                try {
                    return downloadStorageObjectInternal(bucket, objectPath, serviceRoleKey);
                } catch (ResponseStatusException retryException) {
                    // If service role key also fails, throw the original error
                    throw exception;
                }
            }
            throw exception;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Supabase request interrupted");
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Unable to reach Supabase storage service. Please try again.");
        }
    }

    public void deleteStorageObject(String bucket, String objectPath, String bearerToken) {
        String token = resolveToken(bearerToken);
        deleteStorageObjectInternal(bucket, objectPath, token);
    }

    private void deleteStorageObjectInternal(String bucket, String objectPath, String token) {
        String encodedPath = encodeObjectPath(objectPath);
        String url = supabaseUrl + "/storage/v1/object/" + bucket + "/" + encodedPath;

        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("apikey", anonKey)
                    .header("Authorization", "Bearer " + token)
                    .DELETE();

            HttpResponse<byte[]> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofByteArray());
            handleStorageError(response);
        } catch (ResponseStatusException exception) {
            // If the user's token fails due to RLS violation, retry with service role key
            if (hasServiceRoleKey() && isRlsViolation(exception)) {
                LOGGER.debug("User token storage delete failed due to RLS, retrying with service role key");
                try {
                    deleteStorageObjectInternal(bucket, objectPath, serviceRoleKey);
                    return;
                } catch (ResponseStatusException retryException) {
                    // If service role key also fails, throw the original error
                    throw exception;
                }
            }
            throw exception;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Supabase request interrupted");
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Unable to reach Supabase storage service. Please try again.");
        }
    }

    public void ensureStorageBucket(String bucketName) {
        if (!hasServiceRoleKey()) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Bucket not found. Configure SUPABASE_SERVICE_ROLE_KEY or create bucket '" + bucketName + "' manually."
            );
        }

        String url = supabaseUrl + "/storage/v1/bucket";

        try {
            String body = objectMapper.writeValueAsString(java.util.Map.of(
                    "id", bucketName,
                    "name", bucketName,
                    "public", false
            ));

            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("apikey", serviceRoleKey)
                    .header("Authorization", "Bearer " + serviceRoleKey)
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body));

            HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            int statusCode = response.statusCode();

            if (statusCode >= 200 && statusCode < 300) {
                return;
            }

            if (statusCode == HttpStatus.CONFLICT.value()) {
                return;
            }

            String message = extractErrorMessage(response.body());
            throw new ResponseStatusException(mapHttpStatus(statusCode), message);
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Supabase request interrupted");
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Unable to reach Supabase storage service. Please try again.");
        }
    }

    private JsonNode execute(String url, String method, Object payload, String bearerToken, boolean returnRepresentation) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("apikey", anonKey)
                    .header("Authorization", "Bearer " + bearerToken)
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json");

            if (returnRepresentation) {
                builder.header("Prefer", "return=representation");
            }

            if ("GET".equalsIgnoreCase(method)) {
                builder.GET();
            } else {
                String body = payload == null ? "{}" : objectMapper.writeValueAsString(payload);
                builder.method(method, HttpRequest.BodyPublishers.ofString(body));
            }

            HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String message = extractErrorMessage(response.body());
                if (isJwtAuthError(response.statusCode(), message)) {
                    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session expired. Please login again.");
                }
                if (isRateLimitMessage(message)) {
                    throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Email rate limit exceeded. Please wait and retry.");
                }
                throw new ResponseStatusException(mapHttpStatus(response.statusCode()), message);
            }

            String body = response.body();
            if (body == null || body.isBlank()) {
                return objectMapper.createObjectNode();
            }
            return objectMapper.readTree(body);

        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Supabase request interrupted");
        } catch (IOException exception) {
            LOGGER.error("IOException calling Supabase auth: {} {}", exception.getClass().getName(), exception.getMessage(), exception);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Unable to reach authentication service. Please try again.");
        }
    }

    private void handleStorageError(HttpResponse<byte[]> response) {
        int statusCode = response.statusCode();
        if (statusCode >= 200 && statusCode < 300) {
            return;
        }

        String responseText = new String(response.body(), StandardCharsets.UTF_8);
        String message = extractErrorMessage(responseText);

        if (isJwtAuthError(statusCode, message)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session expired. Please login again.");
        }

        throw new ResponseStatusException(mapHttpStatus(statusCode), message);
    }

    private String resolveToken(String bearerToken) {
        return (bearerToken == null || bearerToken.isBlank()) ? anonKey : bearerToken;
    }

    private String encodeObjectPath(String objectPath) {
        return Arrays.stream(objectPath.split("/"))
                .map(segment -> URLEncoder.encode(segment, StandardCharsets.UTF_8))
                .reduce((left, right) -> left + "/" + right)
                .orElse("");
    }

    private String extractErrorMessage(String body) {
        try {
            JsonNode error = objectMapper.readTree(body);
            if (error.has("msg")) return error.get("msg").asText();
            if (error.has("error_description")) return error.get("error_description").asText();
            if (error.has("message")) return error.get("message").asText();
            if (error.has("error")) return error.get("error").asText();
        } catch (Exception ignored) {
        }
        return body != null && !body.isBlank() ? body : "Supabase request failed";
    }

    private boolean isJwtAuthError(int statusCode, String message) {
        if (message == null) return statusCode == HttpStatus.UNAUTHORIZED.value();
        String m = message.toLowerCase();
        return statusCode == HttpStatus.UNAUTHORIZED.value()
                || statusCode == HttpStatus.FORBIDDEN.value()
                || m.contains("invalid jwt")
                || m.contains("token is expired")
                || m.contains("invalid access token");
    }

    private boolean isRateLimitMessage(String message) {
        return message != null && message.toLowerCase().contains("rate limit exceeded");
    }

    private HttpStatus mapHttpStatus(int statusCode) {
        try {
            return HttpStatus.valueOf(statusCode);
        } catch (Exception ignored) {
            return HttpStatus.BAD_REQUEST;
        }
    }

}
