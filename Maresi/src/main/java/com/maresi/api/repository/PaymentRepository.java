package com.maresi.api.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PaymentRepository {
  private final JdbcTemplate jdbc;
  private final ObjectMapper objectMapper;

  public PaymentRepository(JdbcTemplate jdbc, ObjectMapper objectMapper) {
    this.jdbc = jdbc;
    this.objectMapper = objectMapper;
  }

  public Map<String, Object> create(
      UUID userId,
      String type,
      UUID visitRequestId,
      BigDecimal amount,
      BigDecimal commissionAmount,
      BigDecimal ownerAmount,
      String currency,
      String status,
      String providerReference,
      String checkoutUrl,
      Map<String, Object> metadata) {
    return create(
        userId,
        type,
        visitRequestId,
        amount,
        commissionAmount,
        ownerAmount,
        currency,
        status,
        "geniuspay",
        providerReference,
        checkoutUrl,
        metadata);
  }

  public Map<String, Object> create(
      UUID userId,
      String type,
      UUID visitRequestId,
      BigDecimal amount,
      BigDecimal commissionAmount,
      BigDecimal ownerAmount,
      String currency,
      String status,
      String provider,
      String providerReference,
      String checkoutUrl,
      Map<String, Object> metadata) {
    String metadataJson = toJson(metadata);
    return jdbc.queryForObject(
        """
        INSERT INTO payments (
          user_id, type, visit_request_id, amount, commission_amount, owner_amount,
          currency, status, provider, provider_reference, checkout_url, metadata
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb)
        RETURNING *
        """,
        (rs, rowNum) -> RowMaps.payment(rs),
        userId,
        type,
        visitRequestId,
        amount,
        commissionAmount,
        ownerAmount,
        currency,
        status,
        provider == null || provider.isBlank() ? "geniuspay" : provider,
        providerReference,
        checkoutUrl,
        metadataJson);
  }

  public Optional<Map<String, Object>> findById(UUID id) {
    return jdbc.query(
            "SELECT * FROM payments WHERE id = ?", (rs, rowNum) -> RowMaps.payment(rs), id)
        .stream()
        .findFirst();
  }

  public Optional<Map<String, Object>> findByProviderReference(String reference) {
    return jdbc.query(
            "SELECT * FROM payments WHERE provider_reference = ?",
            (rs, rowNum) -> RowMaps.payment(rs),
            reference)
        .stream()
        .findFirst();
  }

  public List<Map<String, Object>> findByUser(UUID userId) {
    return jdbc.query(
        "SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC",
        (rs, rowNum) -> RowMaps.payment(rs),
        userId);
  }

  public Map<String, Object> updateCheckout(UUID id, String providerReference, String checkoutUrl) {
    return jdbc.queryForObject(
        """
        UPDATE payments
        SET provider_reference = ?, checkout_url = ?, updated_at = NOW()
        WHERE id = ?
        RETURNING *
        """,
        (rs, rowNum) -> RowMaps.payment(rs),
        providerReference,
        checkoutUrl,
        id);
  }

  public Optional<Map<String, Object>> markCompleted(UUID id) {
    return jdbc.query(
            """
            UPDATE payments
            SET status = 'completed', updated_at = NOW()
            WHERE id = ? AND status <> 'completed'
            RETURNING *
            """,
            (rs, rowNum) -> RowMaps.payment(rs),
            id)
        .stream()
        .findFirst();
  }

  public Optional<Map<String, Object>> markFailed(UUID id) {
    return jdbc.query(
            """
            UPDATE payments
            SET status = 'failed', updated_at = NOW()
            WHERE id = ? AND status = 'pending'
            RETURNING *
            """,
            (rs, rowNum) -> RowMaps.payment(rs),
            id)
        .stream()
        .findFirst();
  }

  public Optional<Map<String, Object>> findCompletedReservation(UUID visitRequestId) {
    return jdbc.query(
            """
            SELECT * FROM payments
            WHERE visit_request_id = ? AND type = 'reservation' AND status = 'completed'
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (rs, rowNum) -> RowMaps.payment(rs),
            visitRequestId)
        .stream()
        .findFirst();
  }

  public int abandonPendingReservations(UUID visitRequestId) {
    return jdbc.update(
        """
        UPDATE payments
        SET status = 'failed', updated_at = NOW()
        WHERE visit_request_id = ? AND type = 'reservation' AND status = 'pending'
        """,
        visitRequestId);
  }

  public Optional<Map<String, Object>> markRefunded(UUID id) {
    return jdbc.query(
            """
            UPDATE payments
            SET status = 'refunded', updated_at = NOW()
            WHERE id = ? AND status = 'completed'
            RETURNING *
            """,
            (rs, rowNum) -> RowMaps.payment(rs),
            id)
        .stream()
        .findFirst();
  }

  public boolean hasUnpaidCommission(UUID userId) {
    Long n =
        jdbc.queryForObject(
            """
            SELECT COUNT(*) FROM payments
            WHERE user_id = ? AND type = 'commission' AND status = 'pending'
            """,
            Long.class,
            userId);
    return n != null && n > 0;
  }

  public BigDecimal sumPendingAccruedCommission(UUID userId) {
    BigDecimal n =
        jdbc.queryForObject(
            """
            SELECT COALESCE(SUM(amount), 0) FROM payments
            WHERE user_id = ? AND type = 'commission' AND status = 'pending'
              AND checkout_url IS NULL
            """,
            BigDecimal.class,
            userId);
    return n == null ? BigDecimal.ZERO : n;
  }

  public int markPendingAccruedCompleted(UUID userId) {
    return jdbc.update(
        """
        UPDATE payments
        SET status = 'completed', updated_at = NOW()
        WHERE user_id = ? AND type = 'commission' AND status = 'pending'
          AND checkout_url IS NULL
        """,
        userId);
  }

  private String toJson(Map<String, Object> metadata) {
    if (metadata == null || metadata.isEmpty()) return null;
    try {
      return objectMapper.writeValueAsString(metadata);
    } catch (JsonProcessingException e) {
      return "{}";
    }
  }
}
