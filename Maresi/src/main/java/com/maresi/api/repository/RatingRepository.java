package com.maresi.api.repository;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class RatingRepository {
  private final JdbcTemplate jdbc;

  public RatingRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<Map<String, Object>> findByProperty(UUID propertyId) {
    return jdbc.query(
        """
        SELECT r.id, r.property_id, r.user_id, u.full_name AS user_name, r.score, r.comment, r.created_at
        FROM property_ratings r
        JOIN users u ON u.id = r.user_id
        WHERE r.property_id = ?
        ORDER BY r.created_at DESC
        """,
        (rs, rowNum) -> RowMaps.rating(rs),
        propertyId);
  }

  public Map<String, Object> upsert(UUID propertyId, UUID userId, int score, String comment) {
    return jdbc.queryForObject(
        """
        INSERT INTO property_ratings (property_id, user_id, score, comment)
        VALUES (?, ?, ?, ?)
        ON CONFLICT (property_id, user_id)
        DO UPDATE SET score = EXCLUDED.score, comment = EXCLUDED.comment, created_at = NOW()
        RETURNING id, property_id, user_id, score, comment, created_at
        """,
        (rs, rowNum) -> {
          Map<String, Object> m = new LinkedHashMap<>();
          m.put("id", rs.getObject("id"));
          m.put("property_id", rs.getObject("property_id"));
          m.put("user_id", rs.getObject("user_id"));
          m.put("score", rs.getInt("score"));
          m.put("comment", rs.getString("comment"));
          m.put("created_at", rs.getTimestamp("created_at") == null ? null : rs.getTimestamp("created_at").toInstant().toString());
          return m;
        },
        propertyId,
        userId,
        score,
        comment);
  }

  public Map<String, Object> statistics(UUID propertyId) {
    return jdbc.queryForObject(
        """
        SELECT
          COALESCE(ROUND(AVG(score)::numeric, 2), 0) AS average,
          COUNT(*)::int AS count,
          COUNT(*) FILTER (WHERE score = 1)::int AS s1,
          COUNT(*) FILTER (WHERE score = 2)::int AS s2,
          COUNT(*) FILTER (WHERE score = 3)::int AS s3,
          COUNT(*) FILTER (WHERE score = 4)::int AS s4,
          COUNT(*) FILTER (WHERE score = 5)::int AS s5
        FROM property_ratings
        WHERE property_id = ?
        """,
        (rs, rowNum) -> {
          Map<String, Object> stats = new LinkedHashMap<>();
          BigDecimal avg = rs.getBigDecimal("average");
          stats.put("average", avg == null ? BigDecimal.ZERO : avg);
          stats.put("count", rs.getInt("count"));
          Map<Integer, Integer> distribution = new LinkedHashMap<>();
          distribution.put(1, rs.getInt("s1"));
          distribution.put(2, rs.getInt("s2"));
          distribution.put(3, rs.getInt("s3"));
          distribution.put(4, rs.getInt("s4"));
          distribution.put(5, rs.getInt("s5"));
          stats.put("distribution", distribution);
          return stats;
        },
        propertyId);
  }

  public void refreshPropertyAggregate(UUID propertyId) {
    jdbc.update(
        """
        UPDATE properties p
        SET average_rating = sub.average,
            rating_count = sub.count
        FROM (
          SELECT
            COALESCE(ROUND(AVG(score)::numeric, 2), 0) AS average,
            COUNT(*)::int AS count
          FROM property_ratings
          WHERE property_id = ?
        ) sub
        WHERE p.id = ?
        """,
        propertyId,
        propertyId);
  }
}
