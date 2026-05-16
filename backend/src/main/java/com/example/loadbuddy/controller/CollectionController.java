package com.example.loadbuddy.controller;

import com.example.loadbuddy.model.CollectionRequest;
import com.example.loadbuddy.service.CollectionService;
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
@RequestMapping("/api")
public class CollectionController {

    private final SupabaseAuthService supabaseAuthService;
    private final CollectionService collectionService;
    private final ProofService proofService;

    public CollectionController(SupabaseAuthService supabaseAuthService, CollectionService collectionService, ProofService proofService) {
        this.supabaseAuthService = supabaseAuthService;
        this.collectionService = collectionService;
        this.proofService = proofService;
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

    @PatchMapping("/collections/{collectionId}/archive")
    public ResponseEntity<Void> archiveCollection(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable UUID collectionId,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String token = extractToken(auth);
        String reason = body != null ? body.get("reason") : null;
        collectionService.archiveCollection(collectionId, reason, token);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/entries/{entryId}/collections/{collectionId}/proof", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> uploadCollectionProof(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable UUID entryId,
            @PathVariable UUID collectionId,
            @RequestParam("file") MultipartFile file
    ) {
        String token = extractToken(auth);
        proofService.uploadCollectionProof(entryId, collectionId, file, token, collectionService);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/entries/{entryId}/collections/{collectionId}/proof")
    public ResponseEntity<byte[]> downloadCollectionProof(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable UUID entryId,
            @PathVariable UUID collectionId
    ) {
        String token = extractToken(auth);
        ProofService.ProofDownload proof = proofService.downloadCollectionProof(entryId, collectionId, token);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, proof.mimeType())
                .body(proof.bytes());
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
