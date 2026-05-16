package com.example.loadbuddy.service;

import com.example.loadbuddy.model.CollectionRequest;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CollectionService {

    private static final List<String> ALLOWED_PAYMENT_METHODS = List.of(
            "Cash", "Bank Transfer", "GCash", "PayMaya", "Check", "Online Transfer", "Card", "Other"
    );

    private final SupabaseClient supabaseClient;
    private final ObjectMapper objectMapper;

    public CollectionService(SupabaseClient supabaseClient, ObjectMapper objectMapper) {
        this.supabaseClient = supabaseClient;
        this.objectMapper = objectMapper;
    }

    public List<Map<String, Object>> getCollections(UUID entryId, String accessToken) {
        JsonNode response = supabaseClient.callRest(
                "/rest/v1/collections?entry_id=eq." + entryId + "&select=*&order=collection_date.asc",
                "GET",
                null,
                accessToken,
                false
        );

        if (!response.isArray()) {
            return List.of();
        }

        List<Map<String, Object>> collections = new ArrayList<>();
        for (JsonNode node : response) {
            collections.add(objectMapper.convertValue(node, new TypeReference<>() {}));
        }

        return collections;
    }

    public Map<String, Object> createCollection(UUID entryId, UUID userId, CollectionRequest request, String accessToken) {
        validateCollectionRequest(request);

        Map<String, Object> payload = new HashMap<>();
        payload.put("entry_id", entryId.toString());
        payload.put("user_id", userId.toString());
        payload.put("amount_collected", request.getAmount_collected());
        payload.put("collection_date", request.getCollection_date());
        payload.put("payment_method", normalizePaymentMethod(request.getPayment_method()));
        payload.put("notes", hasValue(request.getNotes()) ? request.getNotes().trim() : null);
        payload.put("transaction_id", hasValue(request.getTransaction_id()) ? request.getTransaction_id().trim() : null);

        JsonNode response = supabaseClient.callRest("/rest/v1/collections", "POST", payload, accessToken, true);
        JsonNode row = response.isArray() && !response.isEmpty() ? response.get(0) : response;

        updateEntryStatus(entryId, accessToken);
        return objectMapper.convertValue(row, new TypeReference<>() {});
    }

    public Map<String, Object> updateCollection(UUID collectionId, CollectionRequest request, String accessToken) {
        validateCollectionRequest(request);

        JsonNode existing = supabaseClient.callRest(
                "/rest/v1/collections?collection_id=eq." + collectionId + "&select=entry_id",
                "GET",
                null,
                accessToken,
                false
        );

        if (!existing.isArray() || existing.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Collection not found");
        }

        UUID entryId = UUID.fromString(existing.get(0).path("entry_id").asText());

        Map<String, Object> payload = new HashMap<>();
        payload.put("amount_collected", request.getAmount_collected());
        payload.put("collection_date", request.getCollection_date());
        payload.put("payment_method", normalizePaymentMethod(request.getPayment_method()));
        payload.put("notes", hasValue(request.getNotes()) ? request.getNotes().trim() : null);
        payload.put("transaction_id", hasValue(request.getTransaction_id()) ? request.getTransaction_id().trim() : null);

        supabaseClient.callRest("/rest/v1/collections?collection_id=eq." + collectionId, "PATCH", payload, accessToken, false);
        updateEntryStatus(entryId, accessToken);

        JsonNode response = supabaseClient.callRest(
                "/rest/v1/collections?collection_id=eq." + collectionId + "&select=*",
                "GET",
                null,
                accessToken,
                false
        );

        if (response.isArray() && !response.isEmpty()) {
            return objectMapper.convertValue(response.get(0), new TypeReference<>() {});
        }

        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Collection not found");
    }

    public void deleteCollection(UUID collectionId, String accessToken) {
        JsonNode existing = supabaseClient.callRest(
                "/rest/v1/collections?collection_id=eq." + collectionId + "&select=entry_id",
                "GET",
                null,
                accessToken,
                false
        );

        if (!existing.isArray() || existing.isEmpty()) {
            return;
        }

        UUID entryId = UUID.fromString(existing.get(0).path("entry_id").asText());
        supabaseClient.callRest("/rest/v1/collections?collection_id=eq." + collectionId, "DELETE", null, accessToken, false);
        updateEntryStatus(entryId, accessToken);
    }

    private void updateEntryStatus(UUID entryId, String accessToken) {
        JsonNode entryResponse = supabaseClient.callRest(
                "/rest/v1/entries?entry_id=eq." + entryId + "&select=original_amount",
                "GET",
                null,
                accessToken,
                false
        );

        if (!entryResponse.isArray() || entryResponse.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Entry not found");
        }

        BigDecimal originalAmount = new BigDecimal(entryResponse.get(0).path("original_amount").asText("0"));

        JsonNode collectionsResponse = supabaseClient.callRest(
                "/rest/v1/collections?entry_id=eq." + entryId + "&select=amount_collected",
                "GET",
                null,
                accessToken,
                false
        );

        BigDecimal totalCollected = BigDecimal.ZERO;
        if (collectionsResponse.isArray()) {
            for (JsonNode collection : collectionsResponse) {
                totalCollected = totalCollected.add(new BigDecimal(collection.path("amount_collected").asText("0")));
            }
        }

        BigDecimal remaining = originalAmount.subtract(totalCollected);

        String status;
        Map<String, Object> payload = new HashMap<>();

        if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
            status = "Closed";
            payload.put("entry_status", status);
            payload.put("actual_closed_date", LocalDate.now().toString());
        } else if (totalCollected.compareTo(BigDecimal.ZERO) > 0) {
            status = "Partially Collected";
            payload.put("entry_status", status);
            payload.put("actual_closed_date", null);
        } else {
            status = "Open";
            payload.put("entry_status", status);
            payload.put("actual_closed_date", null);
        }

        supabaseClient.callRest("/rest/v1/entries?entry_id=eq." + entryId, "PATCH", payload, accessToken, false);
    }

    private void validateCollectionRequest(CollectionRequest request) {
        if (request.getAmount_collected() == null || request.getAmount_collected().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "amount_collected must be greater than 0");
        }

        if (!hasValue(request.getCollection_date())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "collection_date is required");
        }

        parseDate(request.getCollection_date(), "collection_date");

        if (hasValue(request.getPayment_method())) {
            String normalized = normalizePaymentMethod(request.getPayment_method());
            if (!ALLOWED_PAYMENT_METHODS.contains(normalized)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "payment_method is invalid");
            }
        }
    }

    private String normalizePaymentMethod(String paymentMethod) {
        if (!hasValue(paymentMethod)) {
            return "Cash";
        }

        String value = paymentMethod.trim();
        for (String allowed : ALLOWED_PAYMENT_METHODS) {
            if (allowed.equalsIgnoreCase(value)) {
                return allowed;
            }
        }
        return value;
    }

    private LocalDate parseDate(String value, String fieldName) {
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " must be YYYY-MM-DD");
        }
    }

    private boolean hasValue(String value) {
        return value != null && !value.isBlank();
    }
}
