package com.example.testapi.controller;

import com.example.testapi.dto.*;
import com.example.testapi.exception.ApiException;
import com.example.testapi.model.AuthenticatedUser;
import com.example.testapi.service.ProfileService;
import com.example.testapi.service.SupabaseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class ApiController {

    private final SupabaseService supabaseService;
    private final ProfileService profileService;

    public ApiController(SupabaseService supabaseService, ProfileService profileService) {
        this.supabaseService = supabaseService;
        this.profileService = profileService;
    }

    @PostMapping("/register")
    public RegisterResponse register(@Valid @RequestBody RegisterRequest request) {
        return supabaseService.register(request);
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return supabaseService.login(request);
    }

    @GetMapping("/profile")
    public ProfileResponse profile(@RequestHeader("Authorization") String authorization) {
        AuthenticatedUser user = authenticate(authorization);
        return profileService.getOrCreateProfile(user);
    }

    @PutMapping("/profile")
    public UpdateProfileResponse updateProfile(
            @RequestHeader("Authorization") String authorization,
            @RequestBody UpdateProfileRequest request
    ) {
        AuthenticatedUser user = authenticate(authorization);
        ProfileResponse profile = profileService.updateProfile(user, request);
        return new UpdateProfileResponse("Profile updated successfully", profile);
    }

    @PutMapping("/profile/password")
    public MessageResponse updatePassword(
            @RequestHeader("Authorization") String authorization,
            @Valid @RequestBody UpdatePasswordRequest request
    ) {
        AuthenticatedUser user = authenticate(authorization);
        supabaseService.updatePassword(user.accessToken(), request.newPassword());
        return new MessageResponse("Password updated successfully");
    }

    @PostMapping(value = "/profile/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UploadPhotoResponse uploadPhoto(
            @RequestHeader("Authorization") String authorization,
            @RequestPart("file") MultipartFile file
    ) {
        AuthenticatedUser user = authenticate(authorization);
        String reference = supabaseService.uploadProfilePhoto(user.accessToken(), user.userId(), file);
        profileService.updatePhoto(user, file.getOriginalFilename(), file.getContentType());
        return new UploadPhotoResponse("Photo uploaded successfully", reference, file.getSize());
    }

    private AuthenticatedUser authenticate(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Missing or invalid Authorization header");
        }
        return supabaseService.authenticate(authorization.substring(7));
    }
}
