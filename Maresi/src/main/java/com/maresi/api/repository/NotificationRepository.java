package com.maresi.api.repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class NotificationRepository {
  private final JdbcTemplate jdbc;

  public NotificationRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<Map<String, Object>> findByUser(UUID userId) {
    return jdbc.query(
        """
        SELECT id, user_id, type, title, message, property_id, read_at, created_at
        FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
        """,
        (rs, rowNum) -> RowMaps.notification(rs),
        userId);
  }

  public Map<String, Object> create(UUID userId, String type, String title, String message, UUID propertyId) {
    return jdbc.queryForObject(
        """
        INSERT INTO notifications (user_id, type, title, message, property_id)
        VALUES (?, ?, ?, ?, ?)
        RETURNING id, user_id, type, title, message, property_id, read_at, created_at
        """,
        (rs, rowNum) -> RowMaps.notification(rs),
        userId,
        type != null ? type : "general",
        title,
        message,
        propertyId);
  }

  public Optional<Map<String, Object>> markRead(UUID userId, UUID id) {
    return jdbc.query(
            """
            UPDATE notifications SET read_at = NOW()
            WHERE user_id = ? AND id = ? AND read_at IS NULL
            RETURNING id, user_id, type, title, message, property_id, read_at, created_at
            """,
            (rs, rowNum) -> RowMaps.notification(rs),
            userId,
            id)
        .stream()
        .findFirst();
  }

  public int markAllRead(UUID userId) {
    return jdbc.update(
        "UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL", userId);
  }
}
