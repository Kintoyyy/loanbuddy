package com.example.loadbuddy.controller;

import com.example.loadbuddy.model.EntryRequest;
import com.example.loadbuddy.service.EntryService;
import com.example.loadbuddy.service.SupabaseAuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/entries")
public class EntryController {

    private final SupabaseAuthService supabaseAuthService;
    private final EntryService entryService;

    public EntryController(SupabaseAuthService supabaseAuthService, EntryService entryService) {
        this.supabaseAuthService = supabaseAuthService;
        this.entryService = entryService;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getEntries(
            @RequestHeader(value = "Authorization", required = false) String auth) {
        String token = extractToken(auth);
        return ResponseEntity.ok(entryService.getEntries(token));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createEntry(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @RequestBody EntryRequest request) {
        String token = extractToken(auth);
        UUID userId = UUID.fromString(supabaseAuthService.getAuthenticatedUserId(token));
        return ResponseEntity.status(HttpStatus.CREATED).body(entryService.createEntry(userId, request, token));
    }

    @PutMapping("/{entryId}")
    public ResponseEntity<Map<String, Object>> updateEntry(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable UUID entryId,
            @RequestBody EntryRequest request) {
        String token = extractToken(auth);
        return ResponseEntity.ok(entryService.updateEntry(entryId, request, token));
    }

    @DeleteMapping("/{entryId}")
    public ResponseEntity<Void> archiveEntry(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable UUID entryId) {
        String token = extractToken(auth);
        entryService.archiveEntry(entryId, token);
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
