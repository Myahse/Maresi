package com.maresi.api.repository;

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
      String email, String passwordHash, String fullName, String role, String phone) {
    return jdbc.queryForObject(
        """
        INSERT INTO users (email, password_hash, full_name, role, phone)
        VALUES (?, ?, ?, ?, ?)
        RETURNING id, email, full_name, role, phone, created_at
        """,
        (rs, rowNum) -> RowMaps.userPublic(rs),
        email,
        passwordHash,
        fullName,
        role,
        phone);
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
}
