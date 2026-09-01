package com.maresi.api.repository;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ActivityRepository {
  private final JdbcTemplate jdbc;
  private final ObjectMapper mapper;

  public ActivityRepository(JdbcTemplate jdbc, ObjectMapper mapper) {
    this.jdbc = jdbc;
    this.mapper = mapper;
  }

  public void record(String action, String entityType, UUID entityId, UUID actorId, String summary, Map<String, Object> payload) {
    String json = "{}";
    try {
      json = mapper.writeValueAsString(payload == null ? Map.of() : payload);
    } catch (Exception ignored) {
    }
    jdbc.update(
        """
        INSERT INTO activity_events (action, entity_type, entity_id, actor_id, summary, payload)
        VALUES (?, ?, ?, ?, ?, CAST(? AS jsonb))
        """,
        action,
        entityType,
        entityId,
        actorId,
        summary,
        json);
  }

  public List<Map<String, Object>> listRecent(int limit) {
    int safe = Math.min(Math.max(limit, 1), 500);
    return jdbc.query(
        """
        SELECT a.*, u.full_name AS actor_name, u.email AS actor_email, u.role AS actor_role
        FROM activity_events a
        LEFT JOIN users u ON u.id = a.actor_id
        ORDER BY a.created_at DESC
        LIMIT ?
        """,
        (rs, rowNum) -> mapRow(rs),
        safe);
  }

  public List<Map<String, Object>> listForActor(UUID actorId, int limit) {
    return listForUser(actorId, limit);
  }

  public List<Map<String, Object>> listForUser(UUID userId, int limit) {
    int safe = Math.min(Math.max(limit, 1), 300);
    return jdbc.query(
        """
        SELECT a.*, u.full_name AS actor_name, u.email AS actor_email, u.role AS actor_role
        FROM activity_events a
        LEFT JOIN users u ON u.id = a.actor_id
        WHERE a.actor_id = ? OR a.entity_id = ?
        ORDER BY a.created_at DESC
        LIMIT ?
        """,
        (rs, rowNum) -> mapRow(rs),
        userId,
        userId,
        safe);
  }

  private Map<String, Object> mapRow(java.sql.ResultSet rs) throws java.sql.SQLException {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", rs.getObject("id"));
    m.put("action", rs.getString("action"));
    m.put("entity_type", rs.getString("entity_type"));
    m.put("entity_id", rs.getObject("entity_id"));
    m.put("actor_id", rs.getObject("actor_id"));
    m.put("summary", rs.getString("summary"));
    m.put("payload", rs.getString("payload"));
    java.sql.Timestamp ts = rs.getTimestamp("created_at");
    if (ts != null) m.put("created_at", ts.toInstant().toString());
    try {
      m.put("actor_name", rs.getString("actor_name"));
      m.put("actor_email", rs.getString("actor_email"));
      m.put("actor_role", rs.getString("actor_role"));
    } catch (java.sql.SQLException ignored) {
    }
    return m;
  }
}
