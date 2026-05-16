package com.example.loadbuddy.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.*;

@Service
public class ProofService {

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"
    );

    private final MinioService minioService;
    private final SupabaseClient supabaseClient;

    public ProofService(MinioService minioService, SupabaseClient supabaseClient) {
        this.minioService = minioService;
        this.supabaseClient = supabaseClient;
    }

    public void uploadLoanProof(UUID loanId, MultipartFile file, String accessToken) {
        uploadProof("loans", "loan_id", loanId, file, accessToken);
    }

    public ProofDownload downloadLoanProof(UUID loanId, String accessToken) {
        return downloadProof("loans", "loan_id", loanId, accessToken);
    }

    public void deleteLoanProof(UUID loanId, String accessToken) {
        deleteProof("loans", "loan_id", loanId, accessToken);
    }

    public void uploadEntryProof(UUID entryId, MultipartFile file, String accessToken) {
        uploadProof("entries", "entry_id", entryId, file, accessToken);
    }

    public ProofDownload downloadEntryProof(UUID entryId, String accessToken) {
        return downloadProof("entries", "entry_id", entryId, accessToken);
    }

    public void deleteEntryProof(UUID entryId, String accessToken) {
        deleteProof("entries", "entry_id", entryId, accessToken);
    }

    public void uploadCollectionProof(UUID entryId, UUID collectionId, MultipartFile file, String accessToken, CollectionService collectionService) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No file provided");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType.toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unsupported file type. Allowed: JPEG, PNG, GIF, WebP, PDF");
        }
        String ext = extensionFor(contentType);
        String objectPath = "collections/" + entryId + "/" + collectionId + ext;

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to read uploaded file");
        }

        JsonNode existing = supabaseClient.callRest(
                "/rest/v1/collections?collection_id=eq." + collectionId + "&select=proof_filename",
                "GET", null, accessToken, false
        );
        if (existing.isArray() && !existing.isEmpty()) {
            String oldFile = existing.get(0).path("proof_filename").asText(null);
            if (oldFile != null && !oldFile.isBlank()) minioService.delete(oldFile);
        }

        minioService.upload(objectPath, bytes, contentType);
        collectionService.saveCollectionProof(collectionId, objectPath, contentType, accessToken);
    }

    public ProofDownload downloadCollectionProof(UUID entryId, UUID collectionId, String accessToken) {
        JsonNode response = supabaseClient.callRest(
                "/rest/v1/collections?collection_id=eq." + collectionId + "&select=proof_filename,proof_mime_type",
                "GET", null, accessToken, false
        );
        if (!response.isArray() || response.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Collection not found");
        }
        JsonNode row = response.get(0);
        String filename = row.path("proof_filename").asText(null);
        String mimeType = row.path("proof_mime_type").asText(null);
        if (filename == null || filename.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No proof attached");
        }
        byte[] bytes = minioService.download(filename);
        return new ProofDownload(bytes, mimeType != null ? mimeType : "application/octet-stream");
    }

    public void uploadPaymentProof(UUID loanId, UUID paymentId, MultipartFile file, String accessToken, LoanService loanService) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No file provided");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType.toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unsupported file type. Allowed: JPEG, PNG, GIF, WebP, PDF");
        }
        String ext = extensionFor(contentType);
        String objectPath = "loan-payments/" + loanId + "/" + paymentId + ext;

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to read uploaded file");
        }

        // Delete previous proof for this payment if exists
        JsonNode existing = supabaseClient.callRest(
                "/rest/v1/loan_payments?payment_id=eq." + paymentId + "&select=proof_filename",
                "GET", null, accessToken, false
        );
        if (existing.isArray() && !existing.isEmpty()) {
            String oldFile = existing.get(0).path("proof_filename").asText(null);
            if (oldFile != null && !oldFile.isBlank()) minioService.delete(oldFile);
        }

        minioService.upload(objectPath, bytes, contentType);
        loanService.savePaymentProof(paymentId, objectPath, contentType, accessToken);
    }

    public ProofDownload downloadPaymentProof(UUID loanId, UUID paymentId, String accessToken) {
        JsonNode response = supabaseClient.callRest(
                "/rest/v1/loan_payments?payment_id=eq." + paymentId + "&select=proof_filename,proof_mime_type",
                "GET", null, accessToken, false
        );
        if (!response.isArray() || response.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found");
        }
        JsonNode row = response.get(0);
        String filename = row.path("proof_filename").asText(null);
        String mimeType = row.path("proof_mime_type").asText(null);
        if (filename == null || filename.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No proof attached");
        }
        byte[] bytes = minioService.download(filename);
        return new ProofDownload(bytes, mimeType != null ? mimeType : "application/octet-stream");
    }

    private void uploadProof(String table, String idColumn, UUID resourceId, MultipartFile file, String accessToken) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No file provided");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType.toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unsupported file type. Allowed: JPEG, PNG, GIF, WebP, PDF");
        }

        String ext = extensionFor(contentType);
        String objectPath = table + "/" + resourceId + "/" + UUID.randomUUID() + ext;

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to read uploaded file");
        }

        // Delete the old proof from storage if one exists
        String existing = fetchProofFilename(table, idColumn, resourceId, accessToken);
        if (existing != null) {
            minioService.delete(existing);
        }

        minioService.upload(objectPath, bytes, contentType);

        Map<String, Object> patch = new HashMap<>();
        patch.put("proof_filename", objectPath);
        patch.put("proof_mime_type", contentType);
        supabaseClient.callRest(
                "/rest/v1/" + table + "?" + idColumn + "=eq." + resourceId,
                "PATCH", patch, accessToken, false
        );
    }

    private ProofDownload downloadProof(String table, String idColumn, UUID resourceId, String accessToken) {
        JsonNode row = fetchRow(table, idColumn, resourceId, accessToken);
        String filename = row.path("proof_filename").asText(null);
        String mimeType = row.path("proof_mime_type").asText(null);

        if (filename == null || filename.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No proof attached");
        }

        byte[] bytes = minioService.download(filename);
        return new ProofDownload(bytes, mimeType != null ? mimeType : "application/octet-stream");
    }

    private void deleteProof(String table, String idColumn, UUID resourceId, String accessToken) {
        String existing = fetchProofFilename(table, idColumn, resourceId, accessToken);
        if (existing == null) {
            return; // nothing to delete
        }

        minioService.delete(existing);

        Map<String, Object> patch = new HashMap<>();
        patch.put("proof_filename", null);
        patch.put("proof_mime_type", null);
        supabaseClient.callRest(
                "/rest/v1/" + table + "?" + idColumn + "=eq." + resourceId,
                "PATCH", patch, accessToken, false
        );
    }

    private String fetchProofFilename(String table, String idColumn, UUID resourceId, String accessToken) {
        JsonNode row = fetchRow(table, idColumn, resourceId, accessToken);
        String filename = row.path("proof_filename").asText(null);
        return (filename == null || filename.isBlank()) ? null : filename;
    }

    private JsonNode fetchRow(String table, String idColumn, UUID resourceId, String accessToken) {
        JsonNode response = supabaseClient.callRest(
                "/rest/v1/" + table + "?" + idColumn + "=eq." + resourceId
                        + "&select=proof_filename,proof_mime_type",
                "GET", null, accessToken, false
        );
        if (!response.isArray() || response.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Resource not found");
        }
        return response.get(0);
    }

    private String extensionFor(String contentType) {
        return switch (contentType.toLowerCase()) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/gif" -> ".gif";
            case "image/webp" -> ".webp";
            case "application/pdf" -> ".pdf";
            default -> "";
        };
    }

    public record ProofDownload(byte[] bytes, String mimeType) {}
}
