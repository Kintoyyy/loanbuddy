package com.example.testapi.dto;

public record UpdateProfileResponse(
        String message,
        ProfileResponse profile
) {
}
