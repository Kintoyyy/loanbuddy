package com.example.loadbuddy.service;

import com.example.loadbuddy.model.EditProfileRequest;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class ProfileService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ProfileService.class);
    private static final Set<String> ALLOWED_PHOTO_CONTENT_TYPES = Set.of("image/jpeg", "image/png");
    private static final int MAX_PHOTO_DIMENSION = 1024;
    private static final float JPEG_QUALITY = 0.82f;
    private static final String DEFAULT_PHOTO_BUCKET = "profile-photos";

    private final SupabaseClient supabaseClient;
    private final ObjectMapper objectMapper;
    private final String profilePhotoBucket;

    public ProfileService(
            SupabaseClient supabaseClient,
            ObjectMapper objectMapper,
            @Value("${app.profile-photo-bucket:" + DEFAULT_PHOTO_BUCKET + "}") String profilePhotoBucket
    ) {
        this.supabaseClient = supabaseClient;
        this.objectMapper = objectMapper;
        this.profilePhotoBucket = profilePhotoBucket;
    }

    public Map<String, Object> getProfile(UUID userId, String accessToken) {
        try {
            JsonNode response = supabaseClient.callRest(
                    "/rest/v1/user_profiles?user_id=eq." + userId + "&select=user_id,email,first_name,last_name,username,birthday,phone,bio,photo_filename,photo_mime_type,created_at,updated_at",
                    "GET", null, accessToken, false
            );

            if (!response.isArray() || response.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found");
            }

            return objectMapper.convertValue(response.get(0), new TypeReference<>() {});
        } catch (ResponseStatusException exception) {
            if (isMissingTableError(exception)) {
                return getProfileFromAuthMetadata(accessToken);
            }
            throw exception;
        }
    }

    public Map<String, Object> updateProfile(UUID userId, EditProfileRequest request, String accessToken) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("first_name", request.getFirstName());
        payload.put("last_name", request.getLastName());
        payload.put("username", request.getUsername());
        payload.put("birthday", request.getBirthday());
        payload.put("phone", request.getPhone());
        payload.put("bio", request.getBio());

        try {
            JsonNode responseNode = supabaseClient.callRest(
                "/rest/v1/user_profiles?user_id=eq." + userId + "&select=user_id,email,first_name,last_name,username,birthday,phone,bio,photo_filename,photo_mime_type,created_at,updated_at",
                    "PATCH", payload, accessToken, true
            );

            if (!responseNode.isArray() || responseNode.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found");
            }

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Profile updated successfully");
            response.put("profile", objectMapper.convertValue(responseNode.get(0), new TypeReference<>() {}));
            return response;
        } catch (ResponseStatusException exception) {
            if (!isMissingTableError(exception)) throw exception;
            updateAuthMetadata(accessToken, payload);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Profile updated successfully");
            response.put("profile", getProfileFromAuthMetadata(accessToken));
            return response;
        }
    }

    public Map<String, Object> uploadPhoto(UUID userId, MultipartFile file, String accessToken) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Photo file is required");
        }

        String contentType = normalizeContentType(file.getContentType());
        if (!ALLOWED_PHOTO_CONTENT_TYPES.contains(contentType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only .jpg and .png files are allowed");
        }

        byte[] bytes;
        try {
            bytes = compressImage(file.getBytes(), contentType);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to read image file");
        }

        String previousFilename = getCurrentPhotoFilename(userId, accessToken);
        String storedFilename = buildStoredFilename(contentType);
        String objectPath = buildObjectPath(userId, storedFilename);

        // Upload to storage bucket
        uploadPhotoToStorageWithBucketRecovery(objectPath, bytes, contentType, accessToken);

        // Update profile metadata in database using service role key (bypasses RLS)
        Map<String, Object> payload = new HashMap<>();
        payload.put("photo_filename", storedFilename);
        payload.put("photo_mime_type", contentType);

        try {
            // Use service role key for database operations to bypass RLS issues
            String updateToken = supabaseClient.getServiceRoleKeyOrAccessToken(accessToken);
            JsonNode responseNode = supabaseClient.callRest(
                    "/rest/v1/user_profiles?user_id=eq." + userId + "&select=user_id",
                    "PATCH", payload, updateToken, true
            );

            if (!responseNode.isArray() || responseNode.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found");
            }
        } catch (ResponseStatusException exception) {
            deleteStorageObjectIfExists(userId, storedFilename, accessToken);
            if (!isMissingTableError(exception)) throw exception;
            // Fallback to auth metadata if table doesn't exist
            Map<String, Object> metadataPayload = new HashMap<>();
            metadataPayload.put("photo_filename", storedFilename);
            metadataPayload.put("photo_mime_type", contentType);
            updateAuthMetadata(accessToken, metadataPayload);
        }

        deleteStorageObjectIfExists(userId, previousFilename, accessToken);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Photo uploaded successfully");
        response.put("file_reference", profilePhotoBucket + "/" + objectPath);
        response.put("size_bytes", bytes.length);
        return response;
    }

    public ProfilePhoto getProfilePhoto(UUID userId, String accessToken) {
        PhotoMetadata metadata = getPhotoMetadata(userId, accessToken);
        if (metadata == null || metadata.filename().isBlank() || metadata.mimeType().isBlank()) {
            return null;
        }

        String mimeType = normalizeContentType(metadata.mimeType());
        if (!ALLOWED_PHOTO_CONTENT_TYPES.contains(mimeType)) {
            clearInvalidProfilePhoto(userId, accessToken, metadata.filename());
            return null;
        }

        byte[] bytes;
        try {
            bytes = supabaseClient.downloadStorageObject(profilePhotoBucket, buildObjectPath(userId, metadata.filename()), accessToken);
        } catch (ResponseStatusException exception) {
            if (exception.getStatusCode().value() == HttpStatus.NOT_FOUND.value()) {
                clearInvalidProfilePhoto(userId, accessToken, metadata.filename());
                return null;
            }
            throw exception;
        }

        if (!isValidImage(bytes, mimeType)) {
            clearInvalidProfilePhoto(userId, accessToken, metadata.filename());
            return null;
        }

        return new ProfilePhoto(bytes, mimeType);
    }

    private String normalizeContentType(String contentType) {
        if (contentType == null) {
            return "";
        }
        return contentType.trim().toLowerCase();
    }

    private void uploadPhotoToStorageWithBucketRecovery(String objectPath, byte[] bytes, String contentType, String accessToken) {
        // Use service role key to bypass RLS restrictions for storage
        String storageToken = supabaseClient.getServiceRoleKeyOrAccessToken(accessToken);
        try {
            supabaseClient.uploadStorageObject(profilePhotoBucket, objectPath, bytes, contentType, storageToken, true);
            return;
        } catch (ResponseStatusException exception) {
            if (!isBucketNotFoundError(exception)) {
                throw exception;
            }
        }

        supabaseClient.ensureStorageBucket(profilePhotoBucket);
        supabaseClient.uploadStorageObject(profilePhotoBucket, objectPath, bytes, contentType, storageToken, true);
    }

    private boolean isBucketNotFoundError(ResponseStatusException exception) {
        String reason = exception.getReason();
        if (reason == null) {
            return false;
        }
        return reason.toLowerCase().contains("bucket not found");
    }

    private byte[] compressImage(byte[] sourceBytes, String contentType) {
        BufferedImage source;
        try {
            source = ImageIO.read(new ByteArrayInputStream(sourceBytes));
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to process image file");
        }

        if (source == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid image file");
        }

        String format = "image/png".equals(contentType) ? "png" : "jpeg";
        BufferedImage resized = resizeIfNeeded(source, MAX_PHOTO_DIMENSION);
        BufferedImage normalized = toCompatibleImage(resized, format);

        return writeCompressedImage(normalized, format);
    }

    private byte[] writeCompressedImage(BufferedImage image, String format) {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName(format);
        if (!writers.hasNext()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported image format");
        }

        ImageWriter writer = writers.next();
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try (ImageOutputStream imageOutput = ImageIO.createImageOutputStream(output)) {
            writer.setOutput(imageOutput);
            ImageWriteParam params = writer.getDefaultWriteParam();

            if (params.canWriteCompressed()) {
                params.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                params.setCompressionQuality("jpeg".equals(format) ? JPEG_QUALITY : 0.9f);
            }

            writer.write(null, new IIOImage(image, null, null), params);
            writer.dispose();
            return output.toByteArray();
        } catch (IOException exception) {
            writer.dispose();
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to process image file");
        }
    }

    private BufferedImage resizeIfNeeded(BufferedImage source, int maxDimension) {
        int width = source.getWidth();
        int height = source.getHeight();
        int longest = Math.max(width, height);

        if (longest <= maxDimension) {
            return source;
        }

        double scale = (double) maxDimension / longest;
        int newWidth = Math.max(1, (int) Math.round(width * scale));
        int newHeight = Math.max(1, (int) Math.round(height * scale));

        BufferedImage resized = new BufferedImage(newWidth, newHeight, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = resized.createGraphics();
        graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        graphics.drawImage(source, 0, 0, newWidth, newHeight, null);
        graphics.dispose();

        return resized;
    }

    private BufferedImage toCompatibleImage(BufferedImage image, String format) {
        if (!"jpeg".equals(format)) {
            return image;
        }

        BufferedImage rgb = new BufferedImage(image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = rgb.createGraphics();
        graphics.setColor(java.awt.Color.WHITE);
        graphics.fillRect(0, 0, image.getWidth(), image.getHeight());
        graphics.drawImage(image, 0, 0, null);
        graphics.dispose();
        return rgb;
    }

    private Map<String, Object> getProfileFromAuthMetadata(String accessToken) {
        JsonNode user = supabaseClient.callAuth("/auth/v1/user", "GET", null, accessToken);
        JsonNode metadata = user.path("user_metadata");

        Map<String, Object> profile = new HashMap<>();
        profile.put("user_id", user.path("id").asText(""));
        profile.put("email", user.path("email").asText(""));
        profile.put("first_name", metadata.path("first_name").asText(""));
        profile.put("last_name", metadata.path("last_name").asText(""));
        profile.put("username", metadata.path("username").asText(""));
        profile.put("birthday", metadata.path("birthday").asText(""));
        profile.put("phone", metadata.path("phone").asText(""));
        profile.put("bio", metadata.path("bio").asText(""));
        profile.put("photo_filename", metadata.path("photo_filename").asText(""));
        profile.put("photo_mime_type", metadata.path("photo_mime_type").asText(""));
        profile.put("created_at", user.path("created_at").asText(""));
        profile.put("updated_at", user.path("updated_at").asText(""));
        return profile;
    }

    private void updateAuthMetadata(String accessToken, Map<String, Object> metadata) {
        supabaseClient.callAuth("/auth/v1/user", "PUT", Map.of("data", metadata), accessToken);
    }

    private String buildStoredFilename(String contentType) {
        String extension = "image/png".equals(contentType) ? ".png" : ".jpg";
        return System.currentTimeMillis() + extension;
    }

    private String buildObjectPath(UUID userId, String filename) {
        return userId + "/" + filename;
    }

    private void deleteStorageObjectIfExists(UUID userId, String filename, String accessToken) {
        if (filename == null || filename.isBlank()) {
            return;
        }
        try {
            supabaseClient.deleteStorageObject(profilePhotoBucket, buildObjectPath(userId, filename), accessToken);
        } catch (ResponseStatusException exception) {
            if (exception.getStatusCode().value() != HttpStatus.NOT_FOUND.value()) {
                throw exception;
            }
        }
    }

    private String getCurrentPhotoFilename(UUID userId, String accessToken) {
        PhotoMetadata metadata = getPhotoMetadata(userId, accessToken);
        return metadata == null ? null : metadata.filename();
    }

    private PhotoMetadata getPhotoMetadata(UUID userId, String accessToken) {
        try {
            JsonNode response = supabaseClient.callRest(
                    "/rest/v1/user_profiles?user_id=eq." + userId + "&select=photo_filename,photo_mime_type",
                    "GET", null, accessToken, false
            );

            if (!response.isArray() || response.isEmpty()) {
                return null;
            }

            JsonNode row = response.get(0);
            return new PhotoMetadata(
                    row.path("photo_filename").asText(""),
                    row.path("photo_mime_type").asText("")
            );
        } catch (ResponseStatusException exception) {
            if (!isMissingTableError(exception)) {
                throw exception;
            }

            JsonNode user = supabaseClient.callAuth("/auth/v1/user", "GET", null, accessToken);
            JsonNode metadata = user.path("user_metadata");
            return new PhotoMetadata(
                    metadata.path("photo_filename").asText(""),
                    metadata.path("photo_mime_type").asText("")
            );
        }
    }

    private boolean isMissingTableError(ResponseStatusException exception) {
        String message = exception.getReason();
        if (message == null) return false;
        String normalized = message.toLowerCase();
        return normalized.contains("could not find the table") || normalized.contains("schema cache");
    }

    private boolean isValidImage(byte[] bytes, String mimeType) {
        if (bytes == null || bytes.length == 0 || !ALLOWED_PHOTO_CONTENT_TYPES.contains(mimeType)) {
            return false;
        }

        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(bytes));
            return image != null && image.getWidth() > 0 && image.getHeight() > 0;
        } catch (IOException exception) {
            return false;
        }
    }

    private void clearInvalidProfilePhoto(UUID userId, String accessToken, String filename) {
        deleteStorageObjectIfExists(userId, filename, accessToken);

        Map<String, Object> clearPayload = new HashMap<>();
        clearPayload.put("photo_filename", null);
        clearPayload.put("photo_mime_type", null);

        try {
            supabaseClient.callRest(
                    "/rest/v1/user_profiles?user_id=eq." + userId,
                    "PATCH", clearPayload, accessToken, false
            );
        } catch (ResponseStatusException exception) {
            if (isMissingTableError(exception)) {
                updateAuthMetadata(accessToken, clearPayload);
            }
        }
    }

    private record PhotoMetadata(String filename, String mimeType) {
    }

    public record ProfilePhoto(byte[] bytes, String mimeType) {
    }
}
