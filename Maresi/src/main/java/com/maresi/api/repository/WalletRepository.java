package com.maresi.api.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class WalletRepository {
  private final JdbcTemplate jdbc;

  public WalletRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public Map<String, Object> ensure(UUID userId) {
    return jdbc.queryForObject(
        """
        INSERT INTO wallets (user_id, balance)
        VALUES (?, 0)
        ON CONFLICT (user_id) DO UPDATE SET user_id = wallets.user_id
        RETURNING *
        """,
        (rs, rowNum) -> RowMaps.wallet(rs),
        userId);
  }

  public BigDecimal balance(UUID userId) {
    ensure(userId);
    BigDecimal n =
        jdbc.queryForObject("SELECT balance FROM wallets WHERE user_id = ?", BigDecimal.class, userId);
    return n == null ? BigDecimal.ZERO : n;
  }

  public List<Map<String, Object>> ledger(UUID userId, int limit) {
    return jdbc.query(
        """
        SELECT * FROM wallet_ledger
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
        """,
        (rs, rowNum) -> RowMaps.walletLedger(rs),
        userId,
        limit);
  }

  public Map<String, Object> credit(
      UUID userId, BigDecimal amount, String entryType, UUID paymentId, UUID visitId, String note) {
    ensure(userId);
    Map<String, Object> wallet =
        jdbc.queryForObject(
            """
            UPDATE wallets
            SET balance = balance + ?, updated_at = NOW()
            WHERE user_id = ?
            RETURNING *
            """,
            (rs, rowNum) -> RowMaps.wallet(rs),
            amount,
            userId);
    appendLedger(userId, entryType, "credit", amount, toMoney(wallet.get("balance")), paymentId, visitId, note);
    return wallet;
  }

  public Optional<Map<String, Object>> tryDebit(
      UUID userId, BigDecimal amount, String entryType, UUID paymentId, UUID visitId, String note) {
    return tryDebitLeavingHeld(userId, amount, BigDecimal.ZERO, entryType, paymentId, visitId, note);
  }

  public Optional<Map<String, Object>> tryDebitLeavingHeld(
      UUID userId,
      BigDecimal amount,
      BigDecimal held,
      String entryType,
      UUID paymentId,
      UUID visitId,
      String note) {
    ensure(userId);
    BigDecimal reserved = held == null ? BigDecimal.ZERO : held.max(BigDecimal.ZERO);
    List<Map<String, Object>> updated =
        jdbc.query(
            """
            UPDATE wallets
            SET balance = balance - ?, updated_at = NOW()
            WHERE user_id = ? AND balance >= ? AND balance - ? >= ?
            RETURNING *
            """,
            (rs, rowNum) -> RowMaps.wallet(rs),
            amount,
            userId,
            amount,
            amount,
            reserved);
    if (updated.isEmpty()) return Optional.empty();
    Map<String, Object> wallet = updated.get(0);
    appendLedger(userId, entryType, "debit", amount, toMoney(wallet.get("balance")), paymentId, visitId, note);
    return Optional.of(wallet);
  }

  private void appendLedger(
      UUID userId,
      String entryType,
      String direction,
      BigDecimal amount,
      BigDecimal balanceAfter,
      UUID paymentId,
      UUID visitId,
      String note) {
    jdbc.update(
        """
        INSERT INTO wallet_ledger (
          user_id, entry_type, direction, amount, balance_after, payment_id, visit_request_id, note
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        userId,
        entryType,
        direction,
        amount,
        balanceAfter,
        paymentId,
        visitId,
        note);
  }

  private static BigDecimal toMoney(Object v) {
    if (v instanceof BigDecimal bd) return bd;
    if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
    return new BigDecimal(String.valueOf(v));
  }
}
