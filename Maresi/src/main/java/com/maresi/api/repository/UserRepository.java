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

  private static final String PUBLIC_COLS =
      """
      id, email, full_name, first_name, last_name, birth_date, gender,
      role, phone, email_verified, created_at,
      account_status, review_message, review_requested_at, identity_updated_at
      """;

  private static final String IDENTITY_COLS =
      PUBLIC_COLS
          + """
      , id_card, selfie_url, id_card_photo_url, id_card_back_url
      """;

  public Optional<Map<String, Object>> findById(UUID id) {
    return jdbc.query(
            "SELECT " + PUBLIC_COLS + " FROM users WHERE id = ?",
            (rs, rowNum) -> RowMaps.userPublic(rs),
            id)
        .stream()
        .findFirst();
  }

  public Optional<Map<String, Object>> findIdentity(UUID id) {
    return jdbc.query(
            "SELECT " + IDENTITY_COLS + " FROM users WHERE id = ?",
            (rs, rowNum) -> RowMaps.userIdentity(rs),
            id)
        .stream()
        .findFirst();
  }

  public Optional<Map<String, Object>> findByEmail(String email) {
    return jdbc.query(
            "SELECT " + PUBLIC_COLS + ", password_hash FROM users WHERE email = ?",
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
            "SELECT " + PUBLIC_COLS + " FROM users WHERE phone = ?",
            (rs, rowNum) -> RowMaps.userPublic(rs),
            phone)
        .stream()
        .findFirst();
  }

  public Map<String, Object> create(
      String email,
      String passwordHash,
      String fullName,
      String firstName,
      String lastName,
      java.sql.Date birthDate,
      String gender,
      String role,
      String phone,
      String idCard,
      String selfieUrl,
      String idCardPhotoUrl,
      String idCardBackUrl) {
    return jdbc.queryForObject(
        """
        INSERT INTO users (
          email, password_hash, full_name, first_name, last_name, birth_date, gender,
          role, phone, id_card, selfie_url, id_card_photo_url, id_card_back_url, email_verified
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)
        RETURNING id, email, full_name, first_name, last_name, birth_date, gender, role, phone, email_verified, created_at
        """,
        (rs, rowNum) -> RowMaps.userPublic(rs),
        email,
        passwordHash,
        fullName,
        firstName,
        lastName,
        birthDate,
        gender,
        role,
        phone,
        idCard,
        selfieUrl,
        idCardPhotoUrl,
        idCardBackUrl);
  }

  public Map<String, Object> createFromPhone(String phone, String fullName, String role) {
    String placeholderEmail = phone.replaceAll("\\D", "") + "@phone.maresi.local";
    return jdbc.queryForObject(
        """
        INSERT INTO users (email, password_hash, full_name, role, phone)
        VALUES (?, NULL, ?, ?, ?)
        RETURNING id, email, full_name, role, phone, email_verified, created_at
        """,
        (rs, rowNum) -> RowMaps.userPublic(rs),
        placeholderEmail,
        fullName,
        role,
        phone);
  }

  public void updatePassword(UUID id, String passwordHash) {
    jdbc.update(
        "UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?",
        passwordHash,
        id);
  }

  public void markEmailVerified(UUID id) {
    jdbc.update(
        """
        UPDATE users
        SET email_verified = TRUE, email_verified_at = NOW(), updated_at = NOW()
        WHERE id = ?
        """,
        id);
  }

  public void requestCorrection(UUID id, String message, boolean suspend) {
    jdbc.update(
        """
        UPDATE users
        SET review_message = ?,
            review_requested_at = NOW(),
            account_status = CASE WHEN ? THEN 'suspended' ELSE account_status END,
            updated_at = NOW()
        WHERE id = ?
        """,
        message,
        suspend,
        id);
  }

  public void unsuspend(UUID id) {
    jdbc.update(
        """
        UPDATE users
        SET account_status = 'ok', updated_at = NOW()
        WHERE id = ?
        """,
        id);
  }

  public void updateIdentity(
      UUID id, String idCard, String selfieUrl, String idFrontUrl, String idBackUrl, boolean liftSuspension) {
    jdbc.update(
        """
        UPDATE users
        SET id_card = COALESCE(?, id_card),
            selfie_url = COALESCE(?, selfie_url),
            id_card_photo_url = COALESCE(?, id_card_photo_url),
            id_card_back_url = COALESCE(?, id_card_back_url),
            identity_updated_at = NOW(),
            account_status = CASE WHEN ? THEN 'ok' ELSE account_status END,
            review_message = CASE WHEN ? THEN NULL ELSE review_message END,
            updated_at = NOW()
        WHERE id = ?
        """,
        idCard,
        selfieUrl,
        idFrontUrl,
        idBackUrl,
        liftSuspension,
        liftSuspension,
        id);
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
