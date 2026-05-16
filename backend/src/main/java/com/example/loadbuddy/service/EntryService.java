package com.example.loadbuddy.service;

import com.example.loadbuddy.model.EntryRequest;
import com.example.loadbuddy.model.PenaltyRequest;
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
public class EntryService {

    private final SupabaseClient supabaseClient;
    private final ObjectMapper objectMapper;

    public EntryService(SupabaseClient supabaseClient, ObjectMapper objectMapper) {
        this.supabaseClient = supabaseClient;
        this.objectMapper = objectMapper;
    }

    public List<Map<String, Object>> getEntries(String accessToken) {
        JsonNode response = supabaseClient.callRest(
                "/rest/v1/entries?select=*,debtor:debtors(debtor_name),collections:collections(amount_collected,is_archived),entry_penalties(penalty_id,amount,reason,penalty_date,created_at)&is_archived=eq.false&order=created_at.desc",
                "GET",
                null,
                accessToken,
                false
        );

        if (!response.isArray()) {
            return List.of();
        }

        List<Map<String, Object>> entries = new ArrayList<>();
        for (JsonNode node : response) {
            Map<String, Object> entry = objectMapper.convertValue(node, new TypeReference<>() {});
            JsonNode debtorNode = node.path("debtor");
            BigDecimal originalAmount = new BigDecimal(node.path("original_amount").asText("0"));
            BigDecimal totalCollected = computeTotalCollected(node.path("collections"));
            BigDecimal stillOwed = originalAmount.subtract(totalCollected).max(BigDecimal.ZERO);
            entry.put("debtor_name", debtorNode.path("debtor_name").asText(""));
            entry.put("total_collected", totalCollected);
            entry.put("still_owed", stillOwed);
            entry.put("total_penalties", computeTotalPenalties(node));
            entries.add(entry);
        }

        return entries;
    }

    public Map<String, Object> createEntry(UUID userId, EntryRequest request, String accessToken) {
        validateEntryRequest(request);

        Map<String, Object> payload = new HashMap<>();
        payload.put("user_id", userId.toString());
        payload.put("debtor_id", request.getDebtor_id());
        payload.put("original_amount", request.getOriginal_amount());
        payload.put("currency", hasValue(request.getCurrency()) ? request.getCurrency().trim() : "PHP");
        payload.put("lending_date", request.getLending_date());
        payload.put("expected_payback_date", hasValue(request.getExpected_payback_date()) ? request.getExpected_payback_date() : null);
        payload.put("notes", hasValue(request.getNotes()) ? request.getNotes().trim() : null);
        payload.put("penalty_rate", request.getPenalty_rate() != null ? request.getPenalty_rate() : BigDecimal.ZERO);

        JsonNode response = supabaseClient.callRest("/rest/v1/entries", "POST", payload, accessToken, true);
        JsonNode row = response.isArray() && !response.isEmpty() ? response.get(0) : response;

        String entryId = row.path("entry_id").asText();
        if (entryId == null || entryId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to create entry");
        }

        return getEntryById(UUID.fromString(entryId), accessToken);
    }

    public Map<String, Object> updateEntry(UUID entryId, EntryRequest request, String accessToken) {
        validateEntryRequest(request);

        Map<String, Object> payload = new HashMap<>();
        payload.put("debtor_id", request.getDebtor_id());
        payload.put("original_amount", request.getOriginal_amount());
        payload.put("currency", hasValue(request.getCurrency()) ? request.getCurrency().trim() : "PHP");
        payload.put("lending_date", request.getLending_date());
        payload.put("expected_payback_date", hasValue(request.getExpected_payback_date()) ? request.getExpected_payback_date() : null);
        payload.put("notes", hasValue(request.getNotes()) ? request.getNotes().trim() : null);
        if (request.getPenalty_rate() != null) payload.put("penalty_rate", request.getPenalty_rate());

        supabaseClient.callRest("/rest/v1/entries?entry_id=eq." + entryId, "PATCH", payload, accessToken, false);
        return getEntryById(entryId, accessToken);
    }

    public void archiveEntry(UUID entryId, String accessToken) {
        Map<String, Object> payload = Map.of("is_archived", true);
        supabaseClient.callRest("/rest/v1/entries?entry_id=eq." + entryId, "PATCH", payload, accessToken, false);
    }

    public void deleteAllEntries(UUID userId, String accessToken) {
        supabaseClient.callRest("/rest/v1/entries?user_id=eq." + userId, "DELETE", null, accessToken, false);
    }

    private Map<String, Object> getEntryById(UUID entryId, String accessToken) {
        JsonNode response = supabaseClient.callRest(
            "/rest/v1/entries?entry_id=eq." + entryId + "&select=*,debtor:debtors(debtor_name),collections:collections(amount_collected,is_archived),entry_penalties(penalty_id,amount,reason,penalty_date,created_at)",
                "GET",
                null,
                accessToken,
                false
        );

        if (response.isArray() && !response.isEmpty()) {
            JsonNode node = response.get(0);
            Map<String, Object> entry = objectMapper.convertValue(node, new TypeReference<>() {});
            BigDecimal originalAmount = new BigDecimal(node.path("original_amount").asText("0"));
            BigDecimal totalCollected = computeTotalCollected(node.path("collections"));
            BigDecimal stillOwed = originalAmount.subtract(totalCollected).max(BigDecimal.ZERO);
            entry.put("debtor_name", node.path("debtor").path("debtor_name").asText(""));
            entry.put("total_collected", totalCollected);
            entry.put("still_owed", stillOwed);
            entry.put("total_penalties", computeTotalPenalties(node));
            return entry;
        }

        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Entry not found");
    }

    private void validateEntryRequest(EntryRequest request) {
        if (!hasValue(request.getDebtor_id())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "debtor_id is required");
        }

        if (request.getOriginal_amount() == null || request.getOriginal_amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "original_amount must be greater than 0");
        }

        requireDate(request.getLending_date(), "lending_date");

        if (hasValue(request.getExpected_payback_date())) {
            LocalDate lendingDate = parseDate(request.getLending_date(), "lending_date");
            LocalDate expectedDate = parseDate(request.getExpected_payback_date(), "expected_payback_date");
            if (expectedDate.isBefore(lendingDate)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "expected_payback_date must be on or after lending_date");
            }
        }
    }

    private void requireDate(String date, String fieldName) {
        if (!hasValue(date)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " is required");
        }
        parseDate(date, fieldName);
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

    public Map<String, Object> addEntryPenalty(UUID entryId, PenaltyRequest request, String accessToken) {
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "amount must be greater than 0");
        }
        if (!hasValue(request.getPenaltyDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "penaltyDate is required");
        }
        parseDate(request.getPenaltyDate(), "penaltyDate");

        Map<String, Object> payload = new HashMap<>();
        payload.put("entry_id", entryId.toString());
        payload.put("amount", request.getAmount());
        payload.put("penalty_date", request.getPenaltyDate());
        if (hasValue(request.getReason())) payload.put("reason", request.getReason().trim());

        JsonNode response = supabaseClient.callRest("/rest/v1/entry_penalties", "POST", payload, accessToken, true);
        JsonNode row = response.isArray() && !response.isEmpty() ? response.get(0) : response;
        return objectMapper.convertValue(row, new TypeReference<>() {});
    }

    private BigDecimal computeTotalPenalties(JsonNode entryNode) {
        BigDecimal total = BigDecimal.ZERO;
        JsonNode penalties = entryNode.path("entry_penalties");
        if (penalties.isArray()) {
            for (JsonNode p : penalties) {
                total = total.add(new BigDecimal(p.path("amount").asText("0")));
            }
        }
        return total;
    }

    private BigDecimal computeTotalCollected(JsonNode collectionsNode) {
        BigDecimal total = BigDecimal.ZERO;
        if (!collectionsNode.isArray()) {
            return total;
        }

        for (JsonNode collectionNode : collectionsNode) {
            if (!collectionNode.path("is_archived").asBoolean(false)) {
                total = total.add(new BigDecimal(collectionNode.path("amount_collected").asText("0")));
            }
        }
        return total;
    }
}
