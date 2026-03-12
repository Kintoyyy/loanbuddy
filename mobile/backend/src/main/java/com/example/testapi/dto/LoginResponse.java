package com.example.testapi.dto;

public record LoginResponse(
        String message,
        String access_token,
        String refresh_token,
        String token_type,
        Integer expires_in,
        String user_id
) {
}
