package com.maresi.api.repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
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
               m.delivered_at, m.read_at,
               m.attachment_url, m.attachment_name, m.attachment_type,
               u.full_name AS sender_name, u.role AS sender_role
        FROM visit_messages m
        JOIN users u ON u.id = m.sender_id
        WHERE m.visit_request_id = ?
        ORDER BY m.created_at ASC
        """,
        (rs, rowNum) -> RowMaps.visitMessage(rs),
        visitId);
  }

  public Optional<Map<String, Object>> findById(UUID visitId, UUID messageId) {
    List<Map<String, Object>> rows =
        jdbc.query(
            """
            SELECT m.id, m.visit_request_id, m.sender_id, m.body, m.created_at,
                   m.delivered_at, m.read_at,
                   m.attachment_url, m.attachment_name, m.attachment_type,
                   u.full_name AS sender_name, u.role AS sender_role
            FROM visit_messages m
            JOIN users u ON u.id = m.sender_id
            WHERE m.visit_request_id = ? AND m.id = ?
            """,
            (rs, rowNum) -> RowMaps.visitMessage(rs),
            visitId,
            messageId);
    return rows.stream().findFirst();
  }

  public Map<String, Object> create(UUID visitId, UUID senderId, String body) {
    return create(visitId, senderId, body, null, null, null);
  }

  public Map<String, Object> create(
      UUID visitId,
      UUID senderId,
      String body,
      String attachmentUrl,
      String attachmentName,
      String attachmentType) {
    return jdbc.queryForObject(
        """
        INSERT INTO visit_messages (
          visit_request_id, sender_id, body, attachment_url, attachment_name, attachment_type
        )
        VALUES (?, ?, ?, ?, ?, ?)
        RETURNING id, visit_request_id, sender_id, body, created_at,
                  delivered_at, read_at,
                  attachment_url, attachment_name, attachment_type
        """,
        (rs, rowNum) -> RowMaps.visitMessage(rs),
        visitId,
        senderId,
        body == null ? "" : body,
        attachmentUrl,
        attachmentName,
        attachmentType);
  }

  public int markIncoming(UUID visitId, UUID readerId, boolean seen) {
    if (seen) {
      return jdbc.update(
          """
          UPDATE visit_messages
          SET delivered_at = COALESCE(delivered_at, NOW()),
              read_at = COALESCE(read_at, NOW())
          WHERE visit_request_id = ? AND sender_id <> ? AND read_at IS NULL
          """,
          visitId,
          readerId);
    }
    return jdbc.update(
        """
        UPDATE visit_messages
        SET delivered_at = COALESCE(delivered_at, NOW())
        WHERE visit_request_id = ? AND sender_id <> ? AND delivered_at IS NULL
        """,
        visitId,
        readerId);
  }
}
