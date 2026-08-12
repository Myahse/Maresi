package com.maresi.api.repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
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
        Timestamp.from(startsAt),
        Timestamp.from(expiresAt),
        lastPaymentId);
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
