package com.example.loadbuddy.controller;

import com.example.loadbuddy.model.EditPasswordRequest;
import com.example.loadbuddy.model.EditProfileRequest;
import com.example.loadbuddy.model.LoginRequest;
import com.example.loadbuddy.model.RegisterRequest;
import com.example.loadbuddy.service.ProfileService;
import com.example.loadbuddy.service.SupabaseAuthService;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.concurrent.TimeUnit;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final SupabaseAuthService supabaseAuthService;
    private final ProfileService profileService;

    public AuthController(
            SupabaseAuthService supabaseAuthService,
            ProfileService profileService
    ) {
        this.supabaseAuthService = supabaseAuthService;
        this.profileService = profileService;
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginRequest request) {
        Map<String, Object> response = supabaseAuthService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody RegisterRequest request) {
        Map<String, Object> response = supabaseAuthService.register(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> profile(@RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        String token = extractToken(authorizationHeader);
        UUID userId = UUID.fromString(supabaseAuthService.getAuthenticatedUserId(token));
        Map<String, Object> response = profileService.getProfile(userId, token);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/profile")
    public ResponseEntity<Map<String, Object>> editProfile(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestBody EditProfileRequest request
    ) {
        String token = extractToken(authorizationHeader);
        UUID userId = UUID.fromString(supabaseAuthService.getAuthenticatedUserId(token));
        Map<String, Object> response = profileService.updateProfile(userId, request, token);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/profile/password")
    public ResponseEntity<Map<String, Object>> editPassword(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestBody EditPasswordRequest request
    ) {
        if (request.getCurrentPassword() == null || request.getCurrentPassword().isBlank()) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "currentPassword is required");
        }

        if (request.getNewPassword() == null || request.getNewPassword().isBlank()) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "newPassword is required");
        }

        if (request.getConfirmPassword() == null || request.getConfirmPassword().isBlank()) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "confirmPassword is required");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Passwords do not match");
        }

        supabaseAuthService.updatePassword(
            extractToken(authorizationHeader),
            request.getCurrentPassword(),
            request.getNewPassword()
        );
        return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
    }

    @PostMapping("/profile/photo")
    public ResponseEntity<Map<String, Object>> uploadPhoto(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam("file") MultipartFile file
    ) {
        String token = extractToken(authorizationHeader);
        UUID userId = UUID.fromString(supabaseAuthService.getAuthenticatedUserId(token));
        Map<String, Object> response = profileService.uploadPhoto(userId, file, token);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/profile/photo")
    public ResponseEntity<byte[]> profilePhoto(@RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        String token = extractToken(authorizationHeader);
        UUID userId = UUID.fromString(supabaseAuthService.getAuthenticatedUserId(token));
        ProfileService.ProfilePhoto photo = profileService.getProfilePhoto(userId, token);

        if (photo == null || photo.bytes().length == 0) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(photo.mimeType()))
                .cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES).cachePrivate())
                .body(photo.bytes());
    }

    private String extractToken(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Bearer token is required");
        }

        String normalized = authorizationHeader.trim().replaceAll("^\"|\"$", "");

        if (!normalized.regionMatches(true, 0, "Bearer", 0, "Bearer".length())) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Bearer token is required");
        }

        String token = normalized.substring("Bearer".length()).trim();
        token = token.replaceFirst("^(?i)bearer\\s+", "").trim();

        if (token.isBlank()) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Bearer token is required");
        }

        return token;
    }

}
