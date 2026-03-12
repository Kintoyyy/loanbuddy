package com.example.testapi.model;

import java.time.OffsetDateTime;
import java.util.UUID;

public record Profile(
        UUID userId,
        String email,
        String fullName,
        String phone,
        String bio,
        String photoFilename,
        String photoMimeType,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
