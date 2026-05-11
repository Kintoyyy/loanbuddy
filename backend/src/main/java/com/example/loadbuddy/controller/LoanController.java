package com.example.loadbuddy.controller;

import com.example.loadbuddy.model.LoanPaymentRequest;
import com.example.loadbuddy.model.LoanRequest;
import com.example.loadbuddy.service.LoanService;
import com.example.loadbuddy.service.SupabaseAuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/loans")
public class LoanController {

    private final SupabaseAuthService supabaseAuthService;
    private final LoanService loanService;

    public LoanController(SupabaseAuthService supabaseAuthService, LoanService loanService) {
        this.supabaseAuthService = supabaseAuthService;
        this.loanService = loanService;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getLoans(
            @RequestHeader(value = "Authorization", required = false) String auth) {
        String token = extractToken(auth);
        return ResponseEntity.ok(loanService.getLoans(token));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createLoan(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @RequestBody LoanRequest request) {
        String token = extractToken(auth);
        UUID userId = UUID.fromString(supabaseAuthService.getAuthenticatedUserId(token));
        return ResponseEntity.status(HttpStatus.CREATED).body(loanService.createLoan(userId, request, token));
    }

    @PutMapping("/{loanId}")
    public ResponseEntity<Map<String, Object>> updateLoan(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable UUID loanId,
            @RequestBody LoanRequest request) {
        String token = extractToken(auth);
        return ResponseEntity.ok(loanService.updateLoan(loanId, request, token));
    }

    @DeleteMapping("/{loanId}")
    public ResponseEntity<Void> deleteLoan(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable UUID loanId) {
        String token = extractToken(auth);
        loanService.deleteLoan(loanId, token);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{loanId}/payments")
    public ResponseEntity<Map<String, Object>> addPayment(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable UUID loanId,
            @RequestBody LoanPaymentRequest request) {
        String token = extractToken(auth);
        return ResponseEntity.status(HttpStatus.CREATED).body(loanService.addPayment(loanId, request, token));
    }

    @DeleteMapping("/{loanId}/payments/{paymentId}")
    public ResponseEntity<Void> deletePayment(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable UUID loanId,
            @PathVariable UUID paymentId) {
        String token = extractToken(auth);
        loanService.deletePayment(paymentId, token);
        return ResponseEntity.noContent().build();
    }

    private String extractToken(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bearer token is required");
        }
        String normalized = authorizationHeader.trim().replaceAll("^\"|\"$", "");
        if (!normalized.regionMatches(true, 0, "Bearer", 0, "Bearer".length())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bearer token is required");
        }
        String token = normalized.substring("Bearer".length()).trim();
        token = token.replaceFirst("^(?i)bearer\\s+", "").trim();
        if (token.isBlank()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bearer token is required");
        return token;
    }
}
