package com.maresi.api.repository;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class GuestReviewRepository {
  private final JdbcTemplate jdbc;

  public GuestReviewRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public Map<String, Object> create(
      UUID visitId, UUID guestId, UUID hostId, UUID propertyId, int score, String note) {
    return jdbc.queryForObject(
        """
        INSERT INTO guest_reviews (visit_request_id, guest_id, host_id, property_id, score, note)
        VALUES (?, ?, ?, ?, ?, ?)
        RETURNING id, visit_request_id, score, note, created_at
        """,
        (rs, rowNum) -> mapHostVisible(rs),
        visitId,
        guestId,
        hostId,
        propertyId,
        score,
        note);
  }

  public boolean existsForVisit(UUID visitId) {
    Boolean found =
        jdbc.queryForObject(
            "SELECT EXISTS (SELECT 1 FROM guest_reviews WHERE visit_request_id = ?)",
            Boolean.class,
            visitId);
    return Boolean.TRUE.equals(found);
  }

  public List<Map<String, Object>> findByGuestForHosts(UUID guestId) {
    return jdbc.query(
        """
        SELECT id, visit_request_id, score, note, created_at
        FROM guest_reviews
        WHERE guest_id = ?
        ORDER BY created_at DESC
        LIMIT 20
        """,
        (rs, rowNum) -> mapHostVisible(rs),
        guestId);
  }

  public Map<String, Object> statistics(UUID guestId) {
    return jdbc.queryForObject(
        """
        SELECT
          COALESCE(ROUND(AVG(score)::numeric, 2), 0) AS average,
          COUNT(*)::int AS count
        FROM guest_reviews
        WHERE guest_id = ?
        """,
        (rs, rowNum) -> {
          Map<String, Object> stats = new LinkedHashMap<>();
          BigDecimal avg = rs.getBigDecimal("average");
          stats.put("average", avg == null ? BigDecimal.ZERO : avg);
          stats.put("count", rs.getInt("count"));
          return stats;
        },
        guestId);
  }

  public void refreshGuestAggregate(UUID guestId) {
    jdbc.update(
        """
        UPDATE users u
        SET guest_rating_avg = sub.average,
            guest_rating_count = sub.count
        FROM (
          SELECT
            COALESCE(ROUND(AVG(score)::numeric, 2), 0) AS average,
            COUNT(*)::int AS count
          FROM guest_reviews
          WHERE guest_id = ?
        ) sub
        WHERE u.id = ?
        """,
        guestId,
        guestId);
  }

  public Optional<Map<String, Object>> findByVisit(UUID visitId) {
    return jdbc.query(
            """
            SELECT id, visit_request_id, score, note, created_at
            FROM guest_reviews
            WHERE visit_request_id = ?
            """,
            (rs, rowNum) -> mapHostVisible(rs),
            visitId)
        .stream()
        .findFirst();
  }

  private static Map<String, Object> mapHostVisible(java.sql.ResultSet rs) throws java.sql.SQLException {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", rs.getObject("id"));
    m.put("visit_request_id", rs.getObject("visit_request_id"));
    m.put("score", rs.getInt("score"));
    m.put("note", rs.getString("note"));
    var created = rs.getTimestamp("created_at");
    m.put("created_at", created == null ? null : created.toInstant().toString());
    return m;
  }
}
