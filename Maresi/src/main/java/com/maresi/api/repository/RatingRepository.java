package com.maresi.api.repository;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class RatingRepository {
  private final JdbcTemplate jdbc;

  public RatingRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<Map<String, Object>> findReviewsByProperty(UUID propertyId) {
    return jdbc.query(
        """
        SELECT v.id, v.property_id, v.user_id, u.full_name AS user_name,
               COALESCE(r.score, 0) AS score, v.comment, v.created_at
        FROM property_reviews v
        JOIN users u ON u.id = v.user_id
        LEFT JOIN property_ratings r
          ON r.property_id = v.property_id AND r.user_id = v.user_id
        WHERE v.property_id = ?
        ORDER BY v.created_at DESC
        """,
        (rs, rowNum) -> RowMaps.rating(rs),
        propertyId);
  }

  public Integer findScore(UUID propertyId, UUID userId) {
    try {
      return jdbc.queryForObject(
          "SELECT score FROM property_ratings WHERE property_id = ? AND user_id = ?",
          Integer.class,
          propertyId,
          userId);
    } catch (EmptyResultDataAccessException e) {
      return null;
    }
  }

  public void insertMark(UUID propertyId, UUID userId, int score) {
    jdbc.update(
        """
        INSERT INTO property_ratings (property_id, user_id, score)
        VALUES (?, ?, ?)
        ON CONFLICT (property_id, user_id) DO NOTHING
        """,
        propertyId,
        userId,
        score);
  }

  public Map<String, Object> insertReview(UUID propertyId, UUID userId, String comment) {
    return jdbc.queryForObject(
        """
        INSERT INTO property_reviews (property_id, user_id, comment)
        VALUES (?, ?, ?)
        RETURNING id, property_id, user_id, comment, created_at
        """,
        (rs, rowNum) -> {
          Map<String, Object> m = new LinkedHashMap<>();
          m.put("id", rs.getObject("id"));
          m.put("property_id", rs.getObject("property_id"));
          m.put("user_id", rs.getObject("user_id"));
          m.put("comment", rs.getString("comment"));
          m.put(
              "created_at",
              rs.getTimestamp("created_at") == null
                  ? null
                  : rs.getTimestamp("created_at").toInstant().toString());
          return m;
        },
        propertyId,
        userId,
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
