package com.example.testapi.dto;

public record RegisterResponse(
        String message,
        String user_id,
        String email
) {
}
