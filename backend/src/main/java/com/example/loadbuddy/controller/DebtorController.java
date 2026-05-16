package com.example.loadbuddy.controller;

import com.example.loadbuddy.model.DebtorRequest;
import com.example.loadbuddy.service.DebtorService;
import com.example.loadbuddy.service.SupabaseAuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/debtors")
public class DebtorController {

    private final SupabaseAuthService supabaseAuthService;
    private final DebtorService debtorService;

    public DebtorController(SupabaseAuthService supabaseAuthService, DebtorService debtorService) {
        this.supabaseAuthService = supabaseAuthService;
        this.debtorService = debtorService;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getDebtors(
            @RequestHeader(value = "Authorization", required = false) String auth) {
        String token = extractToken(auth);
        return ResponseEntity.ok(debtorService.getDebtors(token));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createDebtor(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @RequestBody DebtorRequest request) {
        String token = extractToken(auth);
        UUID userId = UUID.fromString(supabaseAuthService.getAuthenticatedUserId(token));
        return ResponseEntity.status(HttpStatus.CREATED).body(debtorService.createDebtor(userId, request, token));
    }

    @PutMapping("/{debtorId}")
    public ResponseEntity<Map<String, Object>> updateDebtor(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable UUID debtorId,
            @RequestBody DebtorRequest request) {
        String token = extractToken(auth);
        return ResponseEntity.ok(debtorService.updateDebtor(debtorId, request, token));
    }

    @DeleteMapping("/{debtorId}")
    public ResponseEntity<Void> archiveDebtor(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable UUID debtorId) {
        String token = extractToken(auth);
        debtorService.archiveDebtor(debtorId, token);
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
