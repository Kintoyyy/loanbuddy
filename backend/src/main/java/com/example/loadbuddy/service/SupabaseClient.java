package com.example.loadbuddy.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

@Service
public class SupabaseClient {

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
    }

    public boolean hasServiceRoleKey() {
        return serviceRoleKey != null && !serviceRoleKey.isBlank();
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
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Unable to reach authentication service. Please try again.");
        }
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
