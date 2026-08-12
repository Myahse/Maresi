package com.maresi.api.repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class VisitRequestRepository {
  private final JdbcTemplate jdbc;

  public VisitRequestRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public Map<String, Object> create(
      UUID userId,
      UUID propertyId,
      String message,
      Object checkIn,
      Object checkOut,
      Object visitDate,
      String visitTime,
      Integer guestsCount,
      String contactPhone,
      String idCard) {
    return jdbc.queryForObject(
        """
        INSERT INTO visit_requests (
          user_id, property_id, message, check_in, check_out,
          visit_date, visit_time, guests_count, contact_phone, id_card
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING *
        """,
        (rs, rowNum) -> RowMaps.visitRequest(rs),
        userId,
        propertyId,
        message,
        checkIn,
        checkOut,
        visitDate,
        visitTime,
        guestsCount != null ? guestsCount : 1,
        contactPhone,
        idCard);
  }

  public Optional<Map<String, Object>> findById(UUID id) {
    return jdbc.query(
            """
            SELECT vr.*, p.title AS property_title, p.location, p.price AS property_price,
                   p.owner_id AS property_owner_id
            FROM visit_requests vr
            JOIN properties p ON vr.property_id = p.id
            WHERE vr.id = ?
            """,
            (rs, rowNum) -> {
              Map<String, Object> m = RowMaps.visitRequest(rs);
              try {
                m.put("property_price", rs.getBigDecimal("property_price"));
                m.put("property_owner_id", rs.getObject("property_owner_id"));
              } catch (Exception ignored) {
              }
              return m;
            },
            id)
        .stream()
        .findFirst();
  }

  public List<Map<String, Object>> findByUser(UUID userId) {
    return jdbc.query(
        """
        SELECT vr.*, p.title AS property_title, p.location
        FROM visit_requests vr
        JOIN properties p ON vr.property_id = p.id
        WHERE vr.user_id = ?
        ORDER BY vr.requested_at DESC
        """,
        (rs, rowNum) -> RowMaps.visitRequest(rs),
        userId);
  }

  public List<Map<String, Object>> findByPropertyOwner(UUID ownerId) {
    return jdbc.query(
        """
        SELECT vr.*, p.title AS property_title, u.full_name AS requester_name, u.email AS requester_email
        FROM visit_requests vr
        JOIN properties p ON vr.property_id = p.id
        JOIN users u ON vr.user_id = u.id
        WHERE p.owner_id = ?
        ORDER BY vr.requested_at DESC
        """,
        (rs, rowNum) -> RowMaps.visitRequest(rs),
        ownerId);
  }

  public Optional<Map<String, Object>> updateStatus(UUID id, String status, UUID ownerId, String ownerNote) {
    return jdbc.query(
            """
            UPDATE visit_requests vr
            SET status = ?, responded_at = NOW(), owner_note = COALESCE(?, vr.owner_note)
            FROM properties p
            WHERE vr.property_id = p.id AND p.owner_id = ? AND vr.id = ?
            RETURNING vr.*
            """,
            (rs, rowNum) -> RowMaps.visitRequest(rs),
            status,
            ownerNote,
            ownerId,
            id)
        .stream()
        .findFirst();
  }

  public Optional<Map<String, Object>> updateStatusById(UUID id, String status) {
    return jdbc.query(
            """
            UPDATE visit_requests
            SET status = ?, responded_at = COALESCE(responded_at, NOW())
            WHERE id = ?
            RETURNING *
            """,
            (rs, rowNum) -> RowMaps.visitRequest(rs),
            status,
            id)
        .stream()
        .findFirst();
  }
}
