package com.example.loadbuddy.service;

import com.example.loadbuddy.model.LoanPaymentRequest;
import com.example.loadbuddy.model.LoanRequest;
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
import java.util.*;

@Service
public class LoanService {

    private final SupabaseClient supabaseClient;
    private final ObjectMapper objectMapper;

    public LoanService(SupabaseClient supabaseClient, ObjectMapper objectMapper) {
        this.supabaseClient = supabaseClient;
        this.objectMapper = objectMapper;
    }

    public List<Map<String, Object>> getLoans(String accessToken) {
        JsonNode response = supabaseClient.callRest(
                "/rest/v1/loans?select=*,loan_payments(payment_id,amount,note,payment_date,proof_filename,proof_mime_type,is_archived,archive_reason,created_at),loan_penalties(penalty_id,amount,reason,penalty_date,created_at)&order=created_at.desc",
                "GET", null, accessToken, false
        );

        if (!response.isArray()) {
            return Collections.emptyList();
        }

        List<Map<String, Object>> loans = new ArrayList<>();
        for (JsonNode loanNode : response) {
            Map<String, Object> loan = objectMapper.convertValue(loanNode, new TypeReference<>() {});
            loan.put("remaining_balance", computeRemaining(loanNode));
            loan.put("paid_amount", computePaid(loanNode));
            loan.put("total_penalties", computeTotalPenalties(loanNode));
            loans.add(loan);
        }
        return loans;
    }

    public Map<String, Object> createLoan(UUID userId, LoanRequest request, String accessToken) {
        requireField(request.getBorrowerName(), "borrowerName");
        if (request.getAmount() == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "amount is required");
        requireField(request.getDateLent(), "dateLent");
        validateAmount(request.getAmount());
        validateDate(request.getDateLent(), "dateLent");
        if (hasValue(request.getDueDate())) validateDate(request.getDueDate(), "dueDate");

        Map<String, Object> payload = new HashMap<>();
        payload.put("lender_id", userId.toString());
        payload.put("borrower_name", request.getBorrowerName().trim());
        payload.put("amount", request.getAmount());
        payload.put("date_lent", request.getDateLent());
        if (hasValue(request.getDescription())) payload.put("description", request.getDescription().trim());
        if (hasValue(request.getDueDate())) payload.put("due_date", request.getDueDate());
        payload.put("interest_rate", request.getInterestRate() != null ? request.getInterestRate() : BigDecimal.ZERO);
        payload.put("payment_frequency", hasValue(request.getPaymentFrequency()) ? request.getPaymentFrequency() : "none");
        payload.put("penalty_rate", request.getPenaltyRate() != null ? request.getPenaltyRate() : BigDecimal.ZERO);

        JsonNode response = supabaseClient.callRest("/rest/v1/loans", "POST", payload, accessToken, true);
        JsonNode row = response.isArray() && !response.isEmpty() ? response.get(0) : response;
        Map<String, Object> result = objectMapper.convertValue(row, new TypeReference<>() {});
        result.put("loan_payments", Collections.emptyList());
        result.put("loan_penalties", Collections.emptyList());
        result.put("remaining_balance", request.getAmount());
        result.put("paid_amount", BigDecimal.ZERO);
        result.put("total_penalties", BigDecimal.ZERO);
        result.putIfAbsent("interest_rate", BigDecimal.ZERO);
        result.putIfAbsent("payment_frequency", "none");
        result.putIfAbsent("penalty_rate", BigDecimal.ZERO);
        return result;
    }

    public Map<String, Object> updateLoan(UUID loanId, LoanRequest request, String accessToken) {
        if (request.getAmount() != null) validateAmount(request.getAmount());
        if (hasValue(request.getDateLent())) validateDate(request.getDateLent(), "dateLent");
        if (hasValue(request.getDueDate())) validateDate(request.getDueDate(), "dueDate");
        if (request.getStatus() != null
                && !request.getStatus().equals("active")
                && !request.getStatus().equals("paid")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status must be 'active' or 'paid'");
        }

        Map<String, Object> payload = new HashMap<>();
        if (hasValue(request.getBorrowerName())) payload.put("borrower_name", request.getBorrowerName().trim());
        if (request.getAmount() != null) payload.put("amount", request.getAmount());
        if (hasValue(request.getDateLent())) payload.put("date_lent", request.getDateLent());
        payload.put("description", hasValue(request.getDescription()) ? request.getDescription().trim() : null);
        payload.put("due_date", hasValue(request.getDueDate()) ? request.getDueDate() : null);
        if (request.getStatus() != null) payload.put("status", request.getStatus());
        if (request.getInterestRate() != null) payload.put("interest_rate", request.getInterestRate());
        if (hasValue(request.getPaymentFrequency())) payload.put("payment_frequency", request.getPaymentFrequency());
        if (request.getPenaltyRate() != null) payload.put("penalty_rate", request.getPenaltyRate());

        supabaseClient.callRest("/rest/v1/loans?loan_id=eq." + loanId, "PATCH", payload, accessToken, false);

        JsonNode response = supabaseClient.callRest(
                "/rest/v1/loans?loan_id=eq." + loanId
                        + "&select=*,loan_payments(payment_id,amount,note,payment_date,proof_filename,proof_mime_type,is_archived,archive_reason,created_at),loan_penalties(penalty_id,amount,reason,penalty_date,created_at)",
                "GET", null, accessToken, false
        );
        if (response.isArray() && !response.isEmpty()) {
            JsonNode loanNode = response.get(0);
            Map<String, Object> result = objectMapper.convertValue(loanNode, new TypeReference<>() {});
            result.put("remaining_balance", computeRemaining(loanNode));
            result.put("paid_amount", computePaid(loanNode));
            result.put("total_penalties", computeTotalPenalties(loanNode));
            return result;
        }
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Loan not found");
    }

    public void deleteLoan(UUID loanId, String accessToken) {
        supabaseClient.callRest("/rest/v1/loans?loan_id=eq." + loanId, "DELETE", null, accessToken, false);
    }

    public void deleteAllLoans(UUID userId, String accessToken) {
        supabaseClient.callRest("/rest/v1/loans?lender_id=eq." + userId, "DELETE", null, accessToken, false);
    }

    public Map<String, Object> addPayment(UUID loanId, LoanPaymentRequest request, String accessToken) {
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "amount must be greater than 0");
        }
        requireField(request.getPaymentDate(), "paymentDate");
        validateDate(request.getPaymentDate(), "paymentDate");

        // Fetch loan + existing payments to validate against remaining balance
        JsonNode loanResponse = supabaseClient.callRest(
                "/rest/v1/loans?loan_id=eq." + loanId
                        + "&select=amount,loan_payments(amount,is_archived)",
                "GET", null, accessToken, false
        );
        if (!loanResponse.isArray() || loanResponse.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Loan not found");
        }
        JsonNode loanNode = loanResponse.get(0);
        BigDecimal remaining = computeRemaining(loanNode);

        if (request.getAmount().compareTo(remaining) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Payment of " + request.getAmount() + " exceeds remaining balance of " + remaining);
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("loan_id", loanId.toString());
        payload.put("amount", request.getAmount());
        payload.put("payment_date", request.getPaymentDate());
        if (hasValue(request.getNote())) payload.put("note", request.getNote().trim());

        JsonNode response = supabaseClient.callRest("/rest/v1/loan_payments", "POST", payload, accessToken, true);
        JsonNode row = response.isArray() && !response.isEmpty() ? response.get(0) : response;
        return objectMapper.convertValue(row, new TypeReference<>() {});
    }

    public void archivePayment(UUID paymentId, String reason, String accessToken) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("is_archived", true);
        if (reason != null && !reason.isBlank()) payload.put("archive_reason", reason.trim());
        supabaseClient.callRest("/rest/v1/loan_payments?payment_id=eq." + paymentId, "PATCH", payload, accessToken, false);
    }

    public void savePaymentProof(UUID paymentId, String filename, String mimeType, String accessToken) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("proof_filename", filename);
        payload.put("proof_mime_type", mimeType);
        supabaseClient.callRest("/rest/v1/loan_payments?payment_id=eq." + paymentId, "PATCH", payload, accessToken, false);
    }

    public Map<String, Object> addLoanPenalty(UUID loanId, PenaltyRequest request, String accessToken) {
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "amount must be greater than 0");
        }
        if (!hasValue(request.getPenaltyDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "penaltyDate is required");
        }
        validateDate(request.getPenaltyDate(), "penaltyDate");

        Map<String, Object> payload = new HashMap<>();
        payload.put("loan_id", loanId.toString());
        payload.put("amount", request.getAmount());
        payload.put("penalty_date", request.getPenaltyDate());
        if (hasValue(request.getReason())) payload.put("reason", request.getReason().trim());

        JsonNode response = supabaseClient.callRest("/rest/v1/loan_penalties", "POST", payload, accessToken, true);
        JsonNode row = response.isArray() && !response.isEmpty() ? response.get(0) : response;
        return objectMapper.convertValue(row, new TypeReference<>() {});
    }

    private BigDecimal computeTotalPenalties(JsonNode loanNode) {
        BigDecimal total = BigDecimal.ZERO;
        JsonNode penalties = loanNode.path("loan_penalties");
        if (penalties.isArray()) {
            for (JsonNode p : penalties) {
                total = total.add(new BigDecimal(p.path("amount").asText("0")));
            }
        }
        return total;
    }

    private BigDecimal computePaid(JsonNode loanNode) {
        BigDecimal paid = BigDecimal.ZERO;
        JsonNode payments = loanNode.path("loan_payments");
        if (payments.isArray()) {
            for (JsonNode p : payments) {
                if (!p.path("is_archived").asBoolean(false)) {
                    paid = paid.add(new BigDecimal(p.path("amount").asText("0")));
                }
            }
        }
        return paid;
    }

    private BigDecimal computeRemaining(JsonNode loanNode) {
        BigDecimal total = new BigDecimal(loanNode.path("amount").asText("0"));
        return total.subtract(computePaid(loanNode)).max(BigDecimal.ZERO);
    }

    private boolean hasValue(String s) { return s != null && !s.isBlank(); }

    private void requireField(String value, String name) {
        if (!hasValue(value)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, name + " is required");
    }

    private void validateAmount(BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "amount must be greater than 0");
    }

    private void validateDate(String date, String name) {
        try { LocalDate.parse(date); }
        catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, name + " must be YYYY-MM-DD");
        }
    }
}
