package com.example.testapi.dto;

public record UploadPhotoResponse(
        String message,
        String file_reference,
        long size_bytes
) {
}
