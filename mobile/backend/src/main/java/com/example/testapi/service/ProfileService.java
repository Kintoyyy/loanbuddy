package com.example.testapi.service;

import com.example.testapi.dto.ProfileResponse;
import com.example.testapi.dto.UpdateProfileRequest;
import com.example.testapi.exception.ApiException;
import com.example.testapi.model.AuthenticatedUser;
import com.example.testapi.model.Profile;
import com.example.testapi.repository.ProfileRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class ProfileService {

    private final ProfileRepository profileRepository;

    public ProfileService(ProfileRepository profileRepository) {
        this.profileRepository = profileRepository;
    }

    public ProfileResponse getOrCreateProfile(AuthenticatedUser user) {
        ensureProfileExists(user);
        Profile profile = profileRepository.findByUserId(user.userId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Profile not found"));
        return toResponse(profile);
    }

    public ProfileResponse updateProfile(AuthenticatedUser user, UpdateProfileRequest request) {
        ensureProfileExists(user);
        Profile current = profileRepository.findByUserId(user.userId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Profile not found"));

        String fullName = request.fullName() == null ? current.fullName() : request.fullName();
        String phone = request.phone() == null ? current.phone() : request.phone();
        String bio = request.bio() == null ? current.bio() : request.bio();

        profileRepository.updateBasic(user.userId(), fullName, phone, bio);
        Profile updated = profileRepository.findByUserId(user.userId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Profile not found"));
        return toResponse(updated);
    }

    public ProfileResponse updatePhoto(AuthenticatedUser user, String filename, String mimeType) {
        ensureProfileExists(user);
        profileRepository.updatePhoto(user.userId(), filename, mimeType);
        Profile updated = profileRepository.findByUserId(user.userId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Profile not found"));
        return toResponse(updated);
    }

    private void ensureProfileExists(AuthenticatedUser user) {
        String effectiveName = user.fullName() == null ? "" : user.fullName();
        profileRepository.insert(user.userId(), user.email(), effectiveName);
    }

    private ProfileResponse toResponse(Profile profile) {
        return new ProfileResponse(
                profile.userId(),
                profile.email(),
                profile.fullName(),
                profile.phone(),
                profile.bio(),
                profile.photoFilename(),
                profile.photoMimeType(),
                profile.createdAt(),
                profile.updatedAt()
        );
    }
}
