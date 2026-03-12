package com.example.testapi.repository;

import com.example.testapi.model.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public class ProfileRepository {

    private final JdbcTemplate jdbcTemplate;

    public ProfileRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<Profile> findByUserId(UUID userId) {
        String sql = """
                SELECT user_id, email, full_name, phone, bio, photo_filename, photo_mime_type, created_at, updated_at
                FROM profiles
                WHERE user_id = ?
                """;

        return jdbcTemplate.query(sql, (rs, rowNum) -> new Profile(
                        rs.getObject("user_id", UUID.class),
                        rs.getString("email"),
                        rs.getString("full_name"),
                        rs.getString("phone"),
                        rs.getString("bio"),
                        rs.getString("photo_filename"),
                        rs.getString("photo_mime_type"),
                        rs.getObject("created_at", java.time.OffsetDateTime.class),
                        rs.getObject("updated_at", java.time.OffsetDateTime.class)
                ), userId)
                .stream()
                .findFirst();
    }

    public void insert(UUID userId, String email, String fullName) {
        String sql = """
                INSERT INTO profiles(user_id, email, full_name)
                VALUES (?, ?, ?)
                ON CONFLICT (user_id) DO NOTHING
                """;
        jdbcTemplate.update(sql, userId, email, fullName);
    }

    public void updateBasic(UUID userId, String fullName, String phone, String bio) {
        String sql = """
                UPDATE profiles
                SET full_name = ?, phone = ?, bio = ?, updated_at = now()
                WHERE user_id = ?
                """;
        jdbcTemplate.update(sql, fullName, phone, bio, userId);
    }

    public void updatePhoto(UUID userId, String photoFilename, String photoMimeType) {
        String sql = """
                UPDATE profiles
                SET photo_filename = ?, photo_mime_type = ?, updated_at = now()
                WHERE user_id = ?
                """;
        jdbcTemplate.update(sql, photoFilename, photoMimeType, userId);
    }
}
