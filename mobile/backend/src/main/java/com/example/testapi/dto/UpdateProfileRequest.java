package com.example.testapi.dto;

public record UpdateProfileRequest(
        String fullName,
        String phone,
        String bio
) {
}
