package com.maresi.api.repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {
  private final JdbcTemplate jdbc;

  public UserRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public Optional<Map<String, Object>> findById(UUID id) {
    return jdbc.query(
            "SELECT id, email, full_name, role, phone FROM users WHERE id = ?",
            (rs, rowNum) -> RowMaps.userPublic(rs),
            id)
        .stream()
        .findFirst();
  }

  public Optional<Map<String, Object>> findByEmail(String email) {
    return jdbc.query(
            "SELECT id, email, password_hash, full_name, role, phone FROM users WHERE email = ?",
            (rs, rowNum) -> {
              Map<String, Object> m = RowMaps.userPublic(rs);
              m.put("password_hash", rs.getString("password_hash"));
              return m;
            },
            email)
        .stream()
        .findFirst();
  }

  public Optional<Map<String, Object>> findByPhone(String phone) {
    return jdbc.query(
            "SELECT id, email, full_name, role, phone FROM users WHERE phone = ?",
            (rs, rowNum) -> RowMaps.userPublic(rs),
            phone)
        .stream()
        .findFirst();
  }

  public Map<String, Object> create(
      String email,
      String passwordHash,
      String fullName,
      String role,
      String phone,
      String idCard,
      String selfieUrl,
      String idCardPhotoUrl) {
    return jdbc.queryForObject(
        """
        INSERT INTO users (
          email, password_hash, full_name, role, phone, id_card, selfie_url, id_card_photo_url
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id, email, full_name, role, phone, created_at
        """,
        (rs, rowNum) -> RowMaps.userPublic(rs),
        email,
        passwordHash,
        fullName,
        role,
        phone,
        idCard,
        selfieUrl,
        idCardPhotoUrl);
  }

  public Map<String, Object> createFromPhone(String phone, String fullName, String role) {
    String placeholderEmail = phone.replaceAll("\\D", "") + "@phone.maresi.local";
    return jdbc.queryForObject(
        """
        INSERT INTO users (email, password_hash, full_name, role, phone)
        VALUES (?, NULL, ?, ?, ?)
        RETURNING id, email, full_name, role, phone, created_at
        """,
        (rs, rowNum) -> RowMaps.userPublic(rs),
        placeholderEmail,
        fullName,
        role,
        phone);
  }

  public List<UUID> findIdsByRole(String role) {
    return jdbc.query(
        "SELECT id FROM users WHERE role = ?",
        (rs, rowNum) -> (UUID) rs.getObject("id"),
        role);
  }

  public Optional<Map<String, Object>> updateRole(UUID id, String role) {
    return jdbc.query(
            """
            UPDATE users SET role = ?, updated_at = NOW()
            WHERE id = ?
            RETURNING id, email, full_name, role, phone
            """,
            (rs, rowNum) -> RowMaps.userPublic(rs),
            role,
            id)
        .stream()
        .findFirst();
  }
}
