package com.example.testapi.model;

import java.util.UUID;

public record AuthenticatedUser(
        UUID userId,
        String email,
        String fullName,
        String accessToken
) {
}
