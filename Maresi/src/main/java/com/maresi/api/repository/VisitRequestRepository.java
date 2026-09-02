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
      String idCard,
      String stayRate,
      String arrivalTime,
      String departureTime) {
    return jdbc.queryForObject(
        """
        INSERT INTO visit_requests (
          user_id, property_id, message, check_in, check_out,
          visit_date, visit_time, guests_count, contact_phone, id_card, stay_rate,
          arrival_time, departure_time
        )
        VALUES (?, ?, ?, CAST(? AS date), CAST(? AS date), CAST(? AS date), ?, ?, ?, ?, ?, CAST(? AS time), CAST(? AS time))
        RETURNING *
        """,
        (rs, rowNum) -> RowMaps.visitRequest(rs),
        userId,
        propertyId,
        message,
        checkIn != null ? checkIn.toString() : null,
        checkOut != null ? checkOut.toString() : null,
        visitDate != null ? visitDate.toString() : null,
        visitTime,
        guestsCount != null ? guestsCount : 1,
        contactPhone,
        idCard,
        stayRate != null && !stayRate.isBlank() ? stayRate : "night",
        arrivalTime,
        departureTime);
  }

  public Optional<Map<String, Object>> findById(UUID id) {
    return jdbc.query(
            """
            SELECT vr.*, p.title AS property_title, p.location, p.price AS property_price,
                   p.owner_id AS property_owner_id, p.wave_payment_url, p.orange_money_url,
                   p.price_midday, p.price_full_day, p.check_in_time, p.check_out_time,
                   u.phone AS owner_phone
            FROM visit_requests vr
            JOIN properties p ON vr.property_id = p.id
            JOIN users u ON p.owner_id = u.id
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
        SELECT vr.*, p.title AS property_title, p.location, p.price AS property_price,
               p.owner_id AS property_owner_id, p.wave_payment_url, p.orange_money_url,
               p.price_midday, p.price_full_day, p.check_in_time, p.check_out_time,
               u.phone AS owner_phone
        FROM visit_requests vr
        JOIN properties p ON vr.property_id = p.id
        JOIN users u ON p.owner_id = u.id
        WHERE vr.user_id = ?
        ORDER BY vr.requested_at DESC
        """,
        (rs, rowNum) -> RowMaps.visitRequest(rs),
        userId);
  }

  public List<Map<String, Object>> findByPropertyOwner(UUID ownerId) {
    return jdbc.query(
        """
        SELECT vr.*, p.title AS property_title, p.location,
               u.full_name AS requester_name, u.email AS requester_email,
               u.phone AS requester_phone, u.id_card AS requester_id_card,
               u.selfie_url AS requester_selfie_url, u.id_card_photo_url AS requester_id_photo_url,
               u.id_card_back_url AS requester_id_back_url
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

  public Optional<Map<String, Object>> setPaymentReceipt(UUID id, String url) {
    return jdbc.query(
            """
            UPDATE visit_requests
            SET payment_receipt_url = ?
            WHERE id = ?
            RETURNING *
            """,
            (rs, rowNum) -> RowMaps.visitRequest(rs),
            url,
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

  public Optional<Map<String, Object>> signAgreement(UUID id, UUID userId, String fullName) {
    return jdbc.query(
            """
            UPDATE visit_requests
            SET status = 'awaiting_host_agreement',
                agreement_full_name = ?,
                agreement_accepted = TRUE,
                agreement_signed_at = NOW()
            WHERE id = ? AND user_id = ? AND status = 'awaiting_agreement'
            RETURNING *
            """,
            (rs, rowNum) -> RowMaps.visitRequest(rs),
            fullName,
            id,
            userId)
        .stream()
        .findFirst();
  }

  public Optional<Map<String, Object>> signHostAgreement(UUID id, UUID ownerId, String fullName, String keyCode) {
    return jdbc.query(
            """
            UPDATE visit_requests vr
            SET status = 'awaiting_key',
                host_agreement_full_name = ?,
                host_agreement_accepted = TRUE,
                host_agreement_signed_at = NOW(),
                key_code = ?
            FROM properties p
            WHERE vr.property_id = p.id
              AND p.owner_id = ?
              AND vr.id = ?
              AND vr.status = 'awaiting_host_agreement'
            RETURNING vr.*
            """,
            (rs, rowNum) -> RowMaps.visitRequest(rs),
            fullName,
            keyCode,
            ownerId,
            id)
        .stream()
        .findFirst();
  }

  public Optional<Map<String, Object>> confirmKey(UUID id, UUID ownerId, String keyCode) {
    return jdbc.query(
            """
            UPDATE visit_requests vr
            SET status = 'awaiting_payment', key_confirmed_at = NOW()
            FROM properties p
            WHERE vr.property_id = p.id
              AND p.owner_id = ?
              AND vr.id = ?
              AND vr.status = 'awaiting_key'
              AND vr.key_code = ?
            RETURNING vr.*
            """,
            (rs, rowNum) -> RowMaps.visitRequest(rs),
            ownerId,
            id,
            keyCode)
        .stream()
        .findFirst();
  }

  public List<Map<String, Object>> findAllForAdmin() {
    return jdbc.query(
        """
        SELECT vr.*, p.title AS property_title, p.location, p.price AS property_price,
               p.owner_id AS property_owner_id,
               guest.full_name AS requester_name, guest.email AS requester_email,
               guest.phone AS requester_phone,
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

  public List<Map<String, Object>> findByUserOrOwner(UUID userId) {
    return jdbc.query(
        """
        SELECT vr.*, p.title AS property_title, p.location, p.price AS property_price,
               p.owner_id AS property_owner_id,
               guest.full_name AS requester_name, guest.email AS requester_email,
               host.full_name AS owner_name, host.email AS owner_email
        FROM visit_requests vr
        JOIN properties p ON vr.property_id = p.id
        JOIN users guest ON vr.user_id = guest.id
        JOIN users host ON p.owner_id = host.id
        WHERE vr.user_id = ? OR p.owner_id = ?
        ORDER BY vr.requested_at DESC
        LIMIT 200
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
        },
        userId,
        userId);
  }

  public Optional<Map<String, Object>> findRequesterIdentity(UUID visitId) {
    return jdbc.query(
            """
            SELECT vr.id, vr.user_id, p.owner_id AS property_owner_id,
                   u.selfie_url, u.id_card_photo_url, u.id_card_back_url
            FROM visit_requests vr
            JOIN properties p ON vr.property_id = p.id
            JOIN users u ON vr.user_id = u.id
            WHERE vr.id = ?
            """,
            (rs, rowNum) -> {
              java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
              m.put("id", rs.getObject("id"));
              m.put("user_id", rs.getObject("user_id"));
              m.put("property_owner_id", rs.getObject("property_owner_id"));
              m.put("selfie_url", rs.getString("selfie_url"));
              m.put("id_card_photo_url", rs.getString("id_card_photo_url"));
              m.put("id_card_back_url", rs.getString("id_card_back_url"));
              return m;
            },
            visitId)
        .stream()
        .findFirst();
  }

  public List<Map<String, Object>> findDueStayReminders() {
    return jdbc.query(
        """
        SELECT vr.id, vr.user_id, vr.status, vr.check_in, vr.check_out,
               p.owner_id AS property_owner_id, p.title AS property_title,
               p.check_in_time, p.check_out_time, p.location
        FROM visit_requests vr
        JOIN properties p ON vr.property_id = p.id
        WHERE vr.status IN ('confirmed', 'payment_sent')
          AND vr.closed_at IS NULL
          AND (
            (
              vr.checkin_notified_at IS NULL
              AND vr.check_in IS NOT NULL
              AND (vr.check_in + COALESCE(vr.arrival_time, p.check_in_time, TIME '14:00'))
                    AT TIME ZONE 'Africa/Abidjan' <= NOW()
              AND (vr.check_in + COALESCE(vr.arrival_time, p.check_in_time, TIME '14:00'))
                    AT TIME ZONE 'Africa/Abidjan' > NOW() - INTERVAL '12 hours'
            )
            OR (
              vr.checkout_notified_at IS NULL
              AND vr.check_out IS NOT NULL
              AND (vr.check_out + COALESCE(vr.departure_time, p.check_out_time, TIME '12:00'))
                    AT TIME ZONE 'Africa/Abidjan' <= NOW()
              AND (vr.check_out + COALESCE(vr.departure_time, p.check_out_time, TIME '12:00'))
                    AT TIME ZONE 'Africa/Abidjan' > NOW() - INTERVAL '12 hours'
            )
          )
        LIMIT 80
        """,
        (rs, rowNum) -> RowMaps.visitRequest(rs));
  }

  public Optional<Map<String, Object>> requestExtension(
      UUID id, UUID userId, java.sql.Date newCheckOut, java.math.BigDecimal amount) {
    return jdbc.query(
            """
            UPDATE visit_requests
            SET extension_check_out = ?,
                extension_status = 'pending',
                extension_amount = ?,
                extension_requested_at = NOW(),
                extension_responded_at = NULL,
                extension_note = NULL
            WHERE id = ?
              AND user_id = ?
              AND status IN ('confirmed', 'payment_sent')
              AND (extension_status IS NULL OR extension_status IN ('declined', 'confirmed'))
            RETURNING *
            """,
            (rs, rowNum) -> RowMaps.visitRequest(rs),
            newCheckOut,
            amount,
            id,
            userId)
        .stream()
        .findFirst();
  }

  public Optional<Map<String, Object>> approveExtension(UUID id, UUID ownerId, String note) {
    return jdbc.query(
            """
            UPDATE visit_requests vr
            SET check_out = vr.extension_check_out,
                extension_status = 'awaiting_payment',
                extension_responded_at = NOW(),
                extension_note = COALESCE(?, vr.extension_note),
                checkout_notified_at = NULL
            FROM properties p
            WHERE vr.property_id = p.id
              AND p.owner_id = ?
              AND vr.id = ?
              AND vr.extension_status = 'pending'
              AND vr.extension_check_out IS NOT NULL
            RETURNING vr.*
            """,
            (rs, rowNum) -> RowMaps.visitRequest(rs),
            note,
            ownerId,
            id)
        .stream()
        .findFirst();
  }

  public Optional<Map<String, Object>> declineExtension(UUID id, UUID ownerId, String note) {
    return jdbc.query(
            """
            UPDATE visit_requests vr
            SET extension_status = 'declined',
                extension_responded_at = NOW(),
                extension_note = COALESCE(?, vr.extension_note)
            FROM properties p
            WHERE vr.property_id = p.id
              AND p.owner_id = ?
              AND vr.id = ?
              AND vr.extension_status = 'pending'
            RETURNING vr.*
            """,
            (rs, rowNum) -> RowMaps.visitRequest(rs),
            note,
            ownerId,
            id)
        .stream()
        .findFirst();
  }

  public Optional<Map<String, Object>> markExtensionPaid(UUID id, UUID userId) {
    return jdbc.query(
            """
            UPDATE visit_requests
            SET extension_status = 'payment_sent'
            WHERE id = ? AND user_id = ? AND extension_status = 'awaiting_payment'
            RETURNING *
            """,
            (rs, rowNum) -> RowMaps.visitRequest(rs),
            id,
            userId)
        .stream()
        .findFirst();
  }

  public Optional<Map<String, Object>> confirmExtensionPayment(UUID id, UUID ownerId) {
    return jdbc.query(
            """
            UPDATE visit_requests vr
            SET extension_status = 'confirmed'
            FROM properties p
            WHERE vr.property_id = p.id
              AND p.owner_id = ?
              AND vr.id = ?
              AND vr.extension_status = 'payment_sent'
            RETURNING vr.*
            """,
            (rs, rowNum) -> RowMaps.visitRequest(rs),
            ownerId,
            id)
        .stream()
        .findFirst();
  }

  public Optional<Map<String, Object>> billOverstay(
      UUID id, UUID ownerId, java.sql.Date newCheckOut, java.math.BigDecimal amount) {
    return jdbc.query(
            """
            UPDATE visit_requests vr
            SET check_out = ?,
                extension_check_out = ?,
                extension_status = 'awaiting_payment',
                extension_amount = ?,
                extension_requested_at = NOW(),
                extension_responded_at = NOW(),
                checkout_notified_at = NULL
            FROM properties p
            WHERE vr.property_id = p.id
              AND p.owner_id = ?
              AND vr.id = ?
              AND vr.closed_at IS NULL
              AND vr.status IN ('confirmed', 'payment_sent')
              AND (vr.extension_status IS NULL OR vr.extension_status IN ('declined', 'confirmed'))
            RETURNING vr.*
            """,
            (rs, rowNum) -> RowMaps.visitRequest(rs),
            newCheckOut,
            newCheckOut,
            amount,
            ownerId,
            id)
        .stream()
        .findFirst();
  }

  public Optional<Map<String, Object>> closeStay(UUID id, UUID ownerId) {
    return jdbc.query(
            """
            UPDATE visit_requests vr
            SET closed_at = NOW(),
                chat_closed_at = COALESCE(vr.chat_closed_at, NOW())
            FROM properties p
            WHERE vr.property_id = p.id
              AND p.owner_id = ?
              AND vr.id = ?
              AND vr.closed_at IS NULL
              AND vr.status IN ('confirmed', 'payment_sent')
            RETURNING vr.*
            """,
            (rs, rowNum) -> RowMaps.visitRequest(rs),
            ownerId,
            id)
        .stream()
        .findFirst();
  }

  public Optional<Map<String, Object>> closeChat(UUID id) {
    return jdbc.query(
            """
            UPDATE visit_requests
            SET chat_closed_at = NOW()
            WHERE id = ? AND chat_closed_at IS NULL
            RETURNING *
            """,
            (rs, rowNum) -> RowMaps.visitRequest(rs),
            id)
        .stream()
        .findFirst();
  }

  public void markStayNotified(UUID id, String kind) {
    if ("checkout".equals(kind)) {
      jdbc.update(
          "UPDATE visit_requests SET checkout_notified_at = NOW() WHERE id = ? AND checkout_notified_at IS NULL",
          id);
    } else {
      jdbc.update(
          "UPDATE visit_requests SET checkin_notified_at = NOW() WHERE id = ? AND checkin_notified_at IS NULL",
          id);
    }
  }
}
