package com.maresi.api.repository;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class FavoriteRepository {
  private final JdbcTemplate jdbc;

  public FavoriteRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<Map<String, Object>> findByUser(UUID userId) {
    return jdbc.query(
        """
        SELECT f.id, f.property_id, f.created_at, p.title, p.price, p.location, p.property_type, p.images,
               p.amenities, p.bedrooms, p.max_guests, p.average_rating, p.rating_count
        FROM favorites f
        JOIN properties p ON f.property_id = p.id
        WHERE f.user_id = ? AND p.is_active = true
        """
            + PropertyRepository.NOT_IN_RESERVATION
            + """
        ORDER BY f.created_at DESC
        """,
        (rs, rowNum) -> RowMaps.favorite(rs),
        userId);
  }

  public void add(UUID userId, UUID propertyId) {
    jdbc.update(
        "INSERT INTO favorites (user_id, property_id) VALUES (?, ?) ON CONFLICT (user_id, property_id) DO NOTHING",
        userId,
        propertyId);
  }

  public void remove(UUID userId, UUID propertyId) {
    jdbc.update("DELETE FROM favorites WHERE user_id = ? AND property_id = ?", userId, propertyId);
  }
}
