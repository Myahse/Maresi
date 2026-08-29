package com.maresi.api.repository;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PushSubscriptionRepository {
  private final JdbcTemplate jdbc;

  public PushSubscriptionRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public Map<String, Object> upsert(
      UUID userId, String endpoint, String p256dh, String auth, String app) {
    return jdbc.queryForObject(
        """
        INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, app)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT (endpoint) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          p256dh = EXCLUDED.p256dh,
          auth = EXCLUDED.auth,
          app = EXCLUDED.app,
          updated_at = NOW()
        RETURNING id, user_id, endpoint, app, created_at, updated_at
        """,
        (rs, rowNum) -> {
          Map<String, Object> m = new LinkedHashMap<>();
          m.put("id", rs.getObject("id"));
          m.put("user_id", rs.getObject("user_id"));
          m.put("endpoint", rs.getString("endpoint"));
          m.put("app", rs.getString("app"));
          return m;
        },
        userId,
        endpoint,
        p256dh,
        auth,
        app);
  }

  public List<Map<String, Object>> findByUser(UUID userId) {
    return jdbc.query(
        "SELECT id, user_id, endpoint, p256dh, auth, app FROM push_subscriptions WHERE user_id = ?",
        (rs, rowNum) -> {
          Map<String, Object> m = new LinkedHashMap<>();
          m.put("id", rs.getObject("id"));
          m.put("user_id", rs.getObject("user_id"));
          m.put("endpoint", rs.getString("endpoint"));
          m.put("p256dh", rs.getString("p256dh"));
          m.put("auth", rs.getString("auth"));
          m.put("app", rs.getString("app"));
          return m;
        },
        userId);
  }

  public int deleteByEndpoint(String endpoint) {
    return jdbc.update("DELETE FROM push_subscriptions WHERE endpoint = ?", endpoint);
  }

  public int deleteByUserAndEndpoint(UUID userId, String endpoint) {
    return jdbc.update(
        "DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?", userId, endpoint);
  }
}
