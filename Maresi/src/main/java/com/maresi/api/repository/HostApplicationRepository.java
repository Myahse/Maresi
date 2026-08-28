package com.maresi.api.repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class HostApplicationRepository {
  private final JdbcTemplate jdbc;

  public HostApplicationRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public Map<String, Object> create(
      UUID userId, String fullName, String phone, String city, String message, String idCard) {
    return jdbc.queryForObject(
        """
        INSERT INTO host_applications (user_id, full_name, phone, city, message, id_card)
        VALUES (?, ?, ?, ?, ?, ?)
        RETURNING id, user_id, full_name, phone, city, message, id_card, status,
                  admin_note, reviewed_by, reviewed_at, created_at, updated_at
        """,
        (rs, rowNum) -> RowMaps.hostApplication(rs),
        userId,
        fullName,
        phone,
        city,
        message,
        idCard);
  }

  public Optional<Map<String, Object>> findLatestByUser(UUID userId) {
    return jdbc.query(
            """
            SELECT id, user_id, full_name, phone, city, message, id_card, status,
                   admin_note, reviewed_by, reviewed_at, created_at, updated_at
            FROM host_applications
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (rs, rowNum) -> RowMaps.hostApplication(rs),
            userId)
        .stream()
        .findFirst();
  }

  public boolean hasPending(UUID userId) {
    Integer n =
        jdbc.queryForObject(
            "SELECT COUNT(*) FROM host_applications WHERE user_id = ? AND status = 'pending'",
            Integer.class,
            userId);
    return n != null && n > 0;
  }

  public Optional<Map<String, Object>> findById(UUID id) {
    return jdbc.query(
            """
            SELECT ha.id, ha.user_id, ha.full_name, ha.phone, ha.city, ha.message, ha.id_card,
                   ha.status, ha.admin_note, ha.reviewed_by, ha.reviewed_at, ha.created_at, ha.updated_at,
                   u.email AS user_email
            FROM host_applications ha
            JOIN users u ON u.id = ha.user_id
            WHERE ha.id = ?
            """,
            (rs, rowNum) -> RowMaps.hostApplication(rs),
            id)
        .stream()
        .findFirst();
  }

  public List<Map<String, Object>> findAll(String status) {
    if (status != null && !status.isBlank()) {
      return jdbc.query(
          """
          SELECT ha.id, ha.user_id, ha.full_name, ha.phone, ha.city, ha.message, ha.id_card,
                 ha.status, ha.admin_note, ha.reviewed_by, ha.reviewed_at, ha.created_at, ha.updated_at,
                 u.email AS user_email
          FROM host_applications ha
          JOIN users u ON u.id = ha.user_id
          WHERE ha.status = ?
          ORDER BY ha.created_at DESC
          """,
          (rs, rowNum) -> RowMaps.hostApplication(rs),
          status);
    }
    return jdbc.query(
        """
        SELECT ha.id, ha.user_id, ha.full_name, ha.phone, ha.city, ha.message, ha.id_card,
               ha.status, ha.admin_note, ha.reviewed_by, ha.reviewed_at, ha.created_at, ha.updated_at,
               u.email AS user_email
        FROM host_applications ha
        JOIN users u ON u.id = ha.user_id
        ORDER BY ha.created_at DESC
        """,
        (rs, rowNum) -> RowMaps.hostApplication(rs));
  }

  public Optional<Map<String, Object>> review(
      UUID id, String status, String adminNote, UUID reviewedBy) {
    return jdbc.query(
            """
            UPDATE host_applications
            SET status = ?, admin_note = COALESCE(?, admin_note),
                reviewed_by = ?, reviewed_at = NOW()
            WHERE id = ? AND status = 'pending'
            RETURNING id, user_id, full_name, phone, city, message, id_card, status,
                      admin_note, reviewed_by, reviewed_at, created_at, updated_at
            """,
            (rs, rowNum) -> RowMaps.hostApplication(rs),
            status,
            adminNote,
            reviewedBy,
            id)
        .stream()
        .findFirst();
  }
}
