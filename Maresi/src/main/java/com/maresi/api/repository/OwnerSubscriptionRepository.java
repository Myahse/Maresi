package com.maresi.api.repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class OwnerSubscriptionRepository {
  private final JdbcTemplate jdbc;

  public OwnerSubscriptionRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public Optional<Map<String, Object>> findByUser(UUID userId) {
    return jdbc.query(
            "SELECT * FROM owner_subscriptions WHERE user_id = ?",
            (rs, rowNum) -> RowMaps.ownerSubscription(rs),
            userId)
        .stream()
        .findFirst();
  }

  public boolean isActive(UUID userId) {
    return jdbc.query(
            """
            SELECT 1 FROM owner_subscriptions
            WHERE user_id = ?
              AND status = 'active'
              AND expires_at IS NOT NULL
              AND expires_at > NOW()
            LIMIT 1
            """,
            (rs, rowNum) -> true,
            userId)
        .stream()
        .findFirst()
        .orElse(false);
  }

  public Map<String, Object> upsertActive(UUID userId, Instant startsAt, Instant expiresAt, UUID lastPaymentId) {
    Timestamp start = Timestamp.from(startsAt);
    Timestamp expires = Timestamp.from(expiresAt);
    try {
      return jdbc.queryForObject(
          """
          INSERT INTO owner_subscriptions (user_id, status, starts_at, expires_at, last_payment_id, premium_positioning)
          VALUES (?, 'active', ?, ?, ?, TRUE)
          ON CONFLICT (user_id) DO UPDATE SET
            status = 'active',
            starts_at = EXCLUDED.starts_at,
            expires_at = EXCLUDED.expires_at,
            last_payment_id = EXCLUDED.last_payment_id,
            premium_positioning = TRUE,
            updated_at = NOW()
          RETURNING *
          """,
          (rs, rowNum) -> RowMaps.ownerSubscription(rs),
          userId,
          start,
          expires,
          lastPaymentId);
    } catch (DataAccessException e) {
      if (!missingPremiumPositioning(e)) throw e;
      return jdbc.queryForObject(
          """
          INSERT INTO owner_subscriptions (user_id, status, starts_at, expires_at, last_payment_id)
          VALUES (?, 'active', ?, ?, ?)
          ON CONFLICT (user_id) DO UPDATE SET
            status = 'active',
            starts_at = EXCLUDED.starts_at,
            expires_at = EXCLUDED.expires_at,
            last_payment_id = EXCLUDED.last_payment_id,
            updated_at = NOW()
          RETURNING *
          """,
          (rs, rowNum) -> RowMaps.ownerSubscription(rs),
          userId,
          start,
          expires,
          lastPaymentId);
    }
  }

  public Map<String, Object> setInactive(UUID userId) {
    ensureRow(userId);
    try {
      return jdbc.queryForObject(
          """
          UPDATE owner_subscriptions
          SET status = 'inactive', expires_at = NOW(), premium_positioning = FALSE, updated_at = NOW()
          WHERE user_id = ?
          RETURNING *
          """,
          (rs, rowNum) -> RowMaps.ownerSubscription(rs),
          userId);
    } catch (DataAccessException e) {
      if (!missingPremiumPositioning(e)) throw e;
      return jdbc.queryForObject(
          """
          UPDATE owner_subscriptions
          SET status = 'inactive', expires_at = NOW(), updated_at = NOW()
          WHERE user_id = ?
          RETURNING *
          """,
          (rs, rowNum) -> RowMaps.ownerSubscription(rs),
          userId);
    }
  }

  private static boolean missingPremiumPositioning(DataAccessException e) {
    Throwable cause = e.getMostSpecificCause();
    String message = cause != null ? cause.getMessage() : e.getMessage();
    return message != null && message.contains("premium_positioning");
  }

  public Map<String, Object> ensureRow(UUID userId) {
    Optional<Map<String, Object>> existing = findByUser(userId);
    if (existing.isPresent()) return existing.get();
    return jdbc.queryForObject(
        """
        INSERT INTO owner_subscriptions (user_id, status)
        VALUES (?, 'inactive')
        ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
        RETURNING *
        """,
        (rs, rowNum) -> RowMaps.ownerSubscription(rs),
        userId);
  }
}
