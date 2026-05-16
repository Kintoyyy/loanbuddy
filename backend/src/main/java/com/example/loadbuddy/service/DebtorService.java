package com.example.loadbuddy.service;

import com.example.loadbuddy.model.DebtorRequest;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class DebtorService {

    private static final List<String> ALLOWED_DEBTOR_TYPES = List.of("Person", "Entity", "Organization");

    private final SupabaseClient supabaseClient;
    private final ObjectMapper objectMapper;

    public DebtorService(SupabaseClient supabaseClient, ObjectMapper objectMapper) {
        this.supabaseClient = supabaseClient;
        this.objectMapper = objectMapper;
    }

    public List<Map<String, Object>> getDebtors(String accessToken) {
        JsonNode response = supabaseClient.callRest(
                "/rest/v1/debtors?select=*&is_archived=eq.false&order=created_at.desc",
                "GET",
                null,
                accessToken,
                false
        );

        if (!response.isArray()) {
            return List.of();
        }

        List<Map<String, Object>> debtors = new ArrayList<>();
        for (JsonNode node : response) {
            debtors.add(objectMapper.convertValue(node, new TypeReference<>() {}));
        }

        return debtors;
    }

    public Map<String, Object> createDebtor(UUID userId, DebtorRequest request, String accessToken) {
        validateDebtorRequest(request);

        Map<String, Object> payload = new HashMap<>();
        payload.put("user_id", userId.toString());
        payload.put("debtor_name", request.getDebtor_name().trim());
        payload.put("debtor_type", normalizeDebtorType(request.getDebtor_type()));
        payload.put("phone_number", hasValue(request.getPhone_number()) ? request.getPhone_number().trim() : null);
        payload.put("email", hasValue(request.getEmail()) ? request.getEmail().trim() : null);

        JsonNode response = supabaseClient.callRest("/rest/v1/debtors", "POST", payload, accessToken, true);
        JsonNode row = response.isArray() && !response.isEmpty() ? response.get(0) : response;
        return objectMapper.convertValue(row, new TypeReference<>() {});
    }

    public Map<String, Object> updateDebtor(UUID debtorId, DebtorRequest request, String accessToken) {
        validateDebtorRequest(request);

        Map<String, Object> payload = new HashMap<>();
        payload.put("debtor_name", request.getDebtor_name().trim());
        payload.put("debtor_type", normalizeDebtorType(request.getDebtor_type()));
        payload.put("phone_number", hasValue(request.getPhone_number()) ? request.getPhone_number().trim() : null);
        payload.put("email", hasValue(request.getEmail()) ? request.getEmail().trim() : null);

        supabaseClient.callRest("/rest/v1/debtors?debtor_id=eq." + debtorId, "PATCH", payload, accessToken, false);

        JsonNode response = supabaseClient.callRest(
                "/rest/v1/debtors?debtor_id=eq." + debtorId + "&select=*",
                "GET",
                null,
                accessToken,
                false
        );

        if (response.isArray() && !response.isEmpty()) {
            return objectMapper.convertValue(response.get(0), new TypeReference<>() {});
        }

        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Debtor not found");
    }

    public void archiveDebtor(UUID debtorId, String accessToken) {
        Map<String, Object> payload = Map.of("is_archived", true);
        supabaseClient.callRest("/rest/v1/debtors?debtor_id=eq." + debtorId, "PATCH", payload, accessToken, false);
    }

    private void validateDebtorRequest(DebtorRequest request) {
        if (!hasValue(request.getDebtor_name())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "debtor_name is required");
        }

        if (!hasValue(request.getDebtor_type())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "debtor_type is required");
        }

        String normalizedType = normalizeDebtorType(request.getDebtor_type());
        if (!ALLOWED_DEBTOR_TYPES.contains(normalizedType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "debtor_type must be Person, Entity, or Organization");
        }

        if (hasValue(request.getEmail()) && !isValidEmail(request.getEmail().trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email is invalid");
        }
    }

    private String normalizeDebtorType(String debtorType) {
        if (!hasValue(debtorType)) {
            return "Person";
        }

        String value = debtorType.trim();
        for (String allowed : ALLOWED_DEBTOR_TYPES) {
            if (allowed.equalsIgnoreCase(value)) {
                return allowed;
            }
        }

        return value;
    }

    private boolean hasValue(String value) {
        return value != null && !value.isBlank();
    }

    private boolean isValidEmail(String email) {
        return email.matches("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\\\.[A-Za-z]{2,}$");
    }
}
