package com.maresi.api.repository;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AuthTokenRepository {
  private final JdbcTemplate jdbc;

  public AuthTokenRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public void invalidateOpen(UUID userId, String purpose) {
    jdbc.update(
        """
        UPDATE auth_tokens
        SET used_at = NOW()
        WHERE user_id = ? AND purpose = ? AND used_at IS NULL
        """,
        userId,
        purpose);
  }

  public void create(UUID userId, String purpose, String tokenHash, Instant expiresAt) {
    jdbc.update(
        """
        INSERT INTO auth_tokens (user_id, purpose, token_hash, expires_at)
        VALUES (?, ?, ?, ?)
        """,
        userId,
        purpose,
        tokenHash,
        java.sql.Timestamp.from(expiresAt));
  }

  public Optional<Map<String, Object>> findByHash(String tokenHash, String purpose) {
    return jdbc
        .query(
            """
            SELECT id, user_id, purpose, expires_at, used_at
            FROM auth_tokens
            WHERE token_hash = ? AND purpose = ?
            """,
            (rs, rowNum) -> {
              java.sql.Timestamp used = rs.getTimestamp("used_at");
              java.sql.Timestamp expires = rs.getTimestamp("expires_at");
              return Map.<String, Object>of(
                  "id", rs.getObject("id"),
                  "user_id", rs.getObject("user_id"),
                  "purpose", rs.getString("purpose"),
                  "used_at", used == null ? "" : used.toInstant().toString(),
                  "expires_at", expires == null ? "" : expires.toInstant().toString());
            },
            tokenHash,
            purpose)
        .stream()
        .findFirst();
  }

  public Optional<Map<String, Object>> findValid(String tokenHash, String purpose) {
    return jdbc
        .query(
            """
            SELECT id, user_id, purpose, expires_at, used_at
            FROM auth_tokens
            WHERE token_hash = ? AND purpose = ? AND used_at IS NULL AND expires_at > NOW()
            """,
            (rs, rowNum) ->
                Map.<String, Object>of(
                    "id", rs.getObject("id"),
                    "user_id", rs.getObject("user_id"),
                    "purpose", rs.getString("purpose")),
            tokenHash,
            purpose)
        .stream()
        .findFirst();
  }

  public void markUsed(UUID id) {
    jdbc.update("UPDATE auth_tokens SET used_at = NOW() WHERE id = ?", id);
  }
}
