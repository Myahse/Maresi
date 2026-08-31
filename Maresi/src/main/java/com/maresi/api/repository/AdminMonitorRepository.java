package com.maresi.api.repository;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
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
    m.put("properties", count("SELECT COUNT(*) FROM properties"));
    m.put("visits", count("SELECT COUNT(*) FROM visit_requests"));
    m.put("visits_pending", count("SELECT COUNT(*) FROM visit_requests WHERE status = 'pending'"));
    m.put("visits_awaiting_key", count("SELECT COUNT(*) FROM visit_requests WHERE status = 'awaiting_key'"));
    m.put("visits_awaiting_payment", count("SELECT COUNT(*) FROM visit_requests WHERE status = 'awaiting_payment'"));
    m.put("visits_confirmed", count("SELECT COUNT(*) FROM visit_requests WHERE status = 'confirmed'"));
    return m;
  }

  public List<Map<String, Object>> listVisits() {
    return jdbc.query(
        """
        SELECT vr.*, p.title AS property_title, p.location, p.price AS property_price,
               p.owner_id AS property_owner_id,
               guest.full_name AS requester_name, guest.email AS requester_email, guest.phone AS requester_phone,
               host.full_name AS owner_name, host.email AS owner_email
        FROM visit_requests vr
        JOIN properties p ON vr.property_id = p.id
        JOIN users guest ON vr.user_id = guest.id
        JOIN users host ON p.owner_id = host.id
        ORDER BY vr.requested_at DESC
        LIMIT 400
        """,
        (rs, rowNum) -> {
          Map<String, Object> m = RowMaps.visitRequest(rs);
          try {
            m.put("property_price", rs.getBigDecimal("property_price"));
            m.put("owner_name", rs.getString("owner_name"));
            m.put("owner_email", rs.getString("owner_email"));
          } catch (Exception ignored) {
          }
          return m;
        });
  }

  public List<Map<String, Object>> listPaymentsForUser(UUID userId) {
    return jdbc.query(
        """
        SELECT p.*, u.email AS user_email, u.full_name AS user_name
        FROM payments p
        LEFT JOIN users u ON u.id = p.user_id
        WHERE p.user_id = ?
           OR p.visit_request_id IN (
             SELECT vr.id FROM visit_requests vr
             JOIN properties pr ON vr.property_id = pr.id
             WHERE pr.owner_id = ?
           )
        ORDER BY p.created_at DESC
        LIMIT 200
        """,
        (rs, rowNum) -> RowMaps.payment(rs),
        userId,
        userId);
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
