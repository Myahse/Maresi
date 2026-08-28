package com.maresi.api.repository;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AdminMonitorRepository {
  private final JdbcTemplate jdbc;

  public AdminMonitorRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public Map<String, Object> overview() {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("users", count("SELECT COUNT(*) FROM users"));
    m.put("clients", count("SELECT COUNT(*) FROM users WHERE role = 'client'"));
    m.put("owners", count("SELECT COUNT(*) FROM users WHERE role = 'owner'"));
    m.put("admins", count("SELECT COUNT(*) FROM users WHERE role = 'admin'"));
    m.put("payments", count("SELECT COUNT(*) FROM payments"));
    m.put(
        "payments_completed",
        count("SELECT COUNT(*) FROM payments WHERE status = 'completed'"));
    m.put(
        "payments_pending",
        count("SELECT COUNT(*) FROM payments WHERE status IN ('pending', 'processing')"));
    m.put(
        "revenue_completed",
        jdbc.queryForObject(
            "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed'",
            java.math.BigDecimal.class));
    m.put(
        "subscriptions_active",
        count(
            """
            SELECT COUNT(*) FROM owner_subscriptions
            WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at > NOW()
            """));
    m.put("host_applications_pending", count("SELECT COUNT(*) FROM host_applications WHERE status = 'pending'"));
    return m;
  }

  public List<Map<String, Object>> listUsers() {
    return jdbc.query(
        """
        SELECT id, email, full_name, role, phone, created_at
        FROM users
        ORDER BY created_at DESC
        """,
        (rs, rowNum) -> {
          Map<String, Object> m = RowMaps.userPublic(rs);
          java.sql.Timestamp ts = rs.getTimestamp("created_at");
          if (ts != null) m.put("created_at", ts.toInstant().toString());
          return m;
        });
  }

  public List<Map<String, Object>> listPayments() {
    return jdbc.query(
        """
        SELECT p.*, u.email AS user_email, u.full_name AS user_name
        FROM payments p
        LEFT JOIN users u ON u.id = p.user_id
        ORDER BY p.created_at DESC
        LIMIT 300
        """,
        (rs, rowNum) -> RowMaps.payment(rs));
  }

  public List<Map<String, Object>> listSubscriptions() {
    return jdbc.query(
        """
        SELECT s.id, u.id AS user_id, COALESCE(s.status, 'inactive') AS status,
          s.starts_at, s.expires_at, s.last_payment_id, s.created_at, s.updated_at,
          u.email AS user_email, u.full_name AS user_name, u.role AS user_role,
          (s.status = 'active' AND s.expires_at IS NOT NULL AND s.expires_at > NOW()) AS active
        FROM users u
        LEFT JOIN owner_subscriptions s ON s.user_id = u.id
        WHERE u.role = 'owner'
        ORDER BY COALESCE(s.updated_at, u.created_at) DESC
        """,
        (rs, rowNum) -> {
          Map<String, Object> m = RowMaps.ownerSubscription(rs);
          m.put("active", rs.getBoolean("active"));
          return m;
        });
  }

  private long count(String sql) {
    Long n = jdbc.queryForObject(sql, Long.class);
    return n == null ? 0 : n;
  }
}
