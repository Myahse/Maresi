package com.maresi.api.repository;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class VisitMessageRepository {
  private final JdbcTemplate jdbc;

  public VisitMessageRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<Map<String, Object>> findByVisit(UUID visitId) {
    return jdbc.query(
        """
        SELECT m.id, m.visit_request_id, m.sender_id, m.body, m.created_at,
               u.full_name AS sender_name, u.role AS sender_role
        FROM visit_messages m
        JOIN users u ON u.id = m.sender_id
        WHERE m.visit_request_id = ?
        ORDER BY m.created_at ASC
        """,
        (rs, rowNum) -> RowMaps.visitMessage(rs),
        visitId);
  }

  public Map<String, Object> create(UUID visitId, UUID senderId, String body) {
    return jdbc.queryForObject(
        """
        INSERT INTO visit_messages (visit_request_id, sender_id, body)
        VALUES (?, ?, ?)
        RETURNING id, visit_request_id, sender_id, body, created_at
        """,
        (rs, rowNum) -> {
          Map<String, Object> row = RowMaps.visitMessage(rs);
          return row;
        },
        visitId,
        senderId,
        body);
  }
}
