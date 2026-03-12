package com.example.testapi.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ProfileResponse(
        UUID user_id,
        String email,
        String full_name,
        String phone,
        String bio,
        String photo_filename,
        String photo_mime_type,
        OffsetDateTime created_at,
        OffsetDateTime updated_at
) {
}
