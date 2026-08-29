package com.maresi.api.repository;

import com.maresi.api.push.NotificationCreatedEvent;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class NotificationRepository {
  private final JdbcTemplate jdbc;
  private final ApplicationEventPublisher events;

  public NotificationRepository(JdbcTemplate jdbc, ApplicationEventPublisher events) {
    this.jdbc = jdbc;
    this.events = events;
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
    String resolvedType = type != null ? type : "general";
    Map<String, Object> created =
        jdbc.queryForObject(
            """
            INSERT INTO notifications (user_id, type, title, message, property_id)
            VALUES (?, ?, ?, ?, ?)
            RETURNING id, user_id, type, title, message, property_id, read_at, created_at
            """,
            (rs, rowNum) -> RowMaps.notification(rs),
            userId,
            resolvedType,
            title,
            message,
            propertyId);
    events.publishEvent(
        new NotificationCreatedEvent(this, userId, resolvedType, title, message, propertyId));
    return created;
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
