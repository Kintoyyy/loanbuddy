package com.example.loadbuddy.controller;

import com.example.loadbuddy.model.EntryRequest;
import com.example.loadbuddy.model.PenaltyRequest;
import com.example.loadbuddy.service.EntryService;
import com.example.loadbuddy.service.ProofService;
import com.example.loadbuddy.service.SupabaseAuthService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/entries")
public class EntryController {

    private final SupabaseAuthService supabaseAuthService;
    private final EntryService entryService;
    private final ProofService proofService;

    public EntryController(SupabaseAuthService supabaseAuthService, EntryService entryService, ProofService proofService) {
        this.supabaseAuthService = supabaseAuthService;
        this.entryService = entryService;
        this.proofService = proofService;
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

    @DeleteMapping
    public ResponseEntity<Void> deleteAllEntries(
            @RequestHeader(value = "Authorization", required = false) String auth) {
        String token = extractToken(auth);
        UUID userId = UUID.fromString(supabaseAuthService.getAuthenticatedUserId(token));
        entryService.deleteAllEntries(userId, token);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{entryId}/penalties")
    public ResponseEntity<Map<String, Object>> addPenalty(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable UUID entryId,
            @RequestBody PenaltyRequest request) {
        String token = extractToken(auth);
        return ResponseEntity.status(HttpStatus.CREATED).body(entryService.addEntryPenalty(entryId, request, token));
    }

    @PostMapping(value = "/{entryId}/proof", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> uploadProof(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable UUID entryId,
            @RequestParam("file") MultipartFile file) {
        String token = extractToken(auth);
        proofService.uploadEntryProof(entryId, file, token);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{entryId}/proof")
    public ResponseEntity<byte[]> downloadProof(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable UUID entryId) {
        String token = extractToken(auth);
        ProofService.ProofDownload proof = proofService.downloadEntryProof(entryId, token);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, proof.mimeType())
                .body(proof.bytes());
    }

    @DeleteMapping("/{entryId}/proof")
    public ResponseEntity<Void> deleteProof(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable UUID entryId) {
        String token = extractToken(auth);
        proofService.deleteEntryProof(entryId, token);
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
