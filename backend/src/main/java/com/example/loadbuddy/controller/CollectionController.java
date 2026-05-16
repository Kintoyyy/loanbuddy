package com.example.loadbuddy.controller;

import com.example.loadbuddy.model.CollectionRequest;
import com.example.loadbuddy.service.CollectionService;
import com.example.loadbuddy.service.SupabaseAuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class CollectionController {

    private final SupabaseAuthService supabaseAuthService;
    private final CollectionService collectionService;

    public CollectionController(SupabaseAuthService supabaseAuthService, CollectionService collectionService) {
        this.supabaseAuthService = supabaseAuthService;
        this.collectionService = collectionService;
    }

    @GetMapping("/entries/{entryId}/collections")
    public ResponseEntity<List<Map<String, Object>>> getCollections(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable UUID entryId
    ) {
        String token = extractToken(auth);
        return ResponseEntity.ok(collectionService.getCollections(entryId, token));
    }

    @PostMapping("/entries/{entryId}/collections")
    public ResponseEntity<Map<String, Object>> createCollection(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable UUID entryId,
            @RequestBody CollectionRequest request
    ) {
        String token = extractToken(auth);
        UUID userId = UUID.fromString(supabaseAuthService.getAuthenticatedUserId(token));
        return ResponseEntity.status(HttpStatus.CREATED).body(collectionService.createCollection(entryId, userId, request, token));
    }

    @PutMapping("/collections/{collectionId}")
    public ResponseEntity<Map<String, Object>> updateCollection(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable UUID collectionId,
            @RequestBody CollectionRequest request
    ) {
        String token = extractToken(auth);
        return ResponseEntity.ok(collectionService.updateCollection(collectionId, request, token));
    }

    @DeleteMapping("/collections/{collectionId}")
    public ResponseEntity<Void> deleteCollection(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable UUID collectionId
    ) {
        String token = extractToken(auth);
        collectionService.deleteCollection(collectionId, token);
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
        if (token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bearer token is required");
        }
        return token;
    }
}
