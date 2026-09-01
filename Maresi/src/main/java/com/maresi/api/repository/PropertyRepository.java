package com.maresi.api.repository;

import java.math.BigDecimal;
import java.sql.Array;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PropertyRepository {
  private static final String SELECT_JOIN =
      """
      SELECT p.*, u.full_name AS owner_name, u.email AS owner_email, u.phone AS owner_phone
      FROM properties p
      JOIN users u ON p.owner_id = u.id
      """;

  private final JdbcTemplate jdbc;

  public PropertyRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  static final String NOT_IN_RESERVATION =
      """
       AND NOT EXISTS (
         SELECT 1 FROM visit_requests vr
         WHERE vr.property_id = p.id
           AND vr.status IN (
             'pending',
             'accepted',
             'awaiting_agreement',
             'awaiting_key',
             'awaiting_payment',
             'payment_sent',
             'confirmed'
           )
           AND vr.closed_at IS NULL
       )
      """;

  public List<Map<String, Object>> findAll(
      String location,
      BigDecimal minPrice,
      BigDecimal maxPrice,
      String propertyType,
      UUID ownerId,
      boolean excludeReserved,
      boolean includeInactive) {
    StringBuilder sql = new StringBuilder(SELECT_JOIN).append(" WHERE 1=1");
    List<Object> params = new ArrayList<>();
    if (!includeInactive) {
      sql.append(" AND p.is_active = true");
    }
    if (ownerId != null) {
      sql.append(" AND p.owner_id = ?");
      params.add(ownerId);
    }
    if (excludeReserved) {
      sql.append(NOT_IN_RESERVATION);
    }
    if (location != null && !location.isBlank()) {
      sql.append(" AND p.location ILIKE ?");
      params.add("%" + location + "%");
    }
    if (minPrice != null) {
      sql.append(" AND p.price >= ?");
      params.add(minPrice);
    }
    if (maxPrice != null) {
      sql.append(" AND p.price <= ?");
      params.add(maxPrice);
    }
    if (propertyType != null && !propertyType.isBlank()) {
      sql.append(" AND p.property_type = ?");
      params.add(propertyType);
    }
    sql.append(" ORDER BY p.created_at DESC");
    return jdbc.query(sql.toString(), (rs, rowNum) -> RowMaps.property(rs), params.toArray());
  }

  public Optional<Map<String, Object>> findById(UUID id) {
    return jdbc.query(
            SELECT_JOIN + " WHERE p.id = ?",
            (rs, rowNum) -> RowMaps.property(rs),
            id)
        .stream()
        .findFirst();
  }

  public long countByOwner(UUID ownerId) {
    Long n = jdbc.queryForObject("SELECT COUNT(*) FROM properties WHERE owner_id = ?", Long.class, ownerId);
    return n == null ? 0 : n;
  }

  public Map<String, Object> create(
      UUID ownerId,
      String title,
      String description,
      BigDecimal price,
      String location,
      String propertyType,
      List<String> images,
      Map<String, Object> extras) {
    Map<String, Object> extra = extras == null ? Map.of() : extras;
    return jdbc.execute(
        (Connection conn) -> {
          Array imageArray = conn.createArrayOf("text", images != null ? images.toArray() : new String[0]);
          try (var ps =
              conn.prepareStatement(
                  """
                  INSERT INTO properties (
                    owner_id, title, description, price, location, property_type, images,
                    latitude, longitude, bedrooms, max_guests, virtual_tour_url,
                    wave_payment_url, orange_money_url, is_active, amenities,
                    check_in_time, check_out_time, price_midday, price_full_day
                  )
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS time), CAST(? AS time), ?, ?)
                  RETURNING *
                  """)) {
            ps.setObject(1, ownerId);
            ps.setString(2, title);
            ps.setString(3, description);
            ps.setBigDecimal(4, price);
            ps.setString(5, location);
            ps.setString(6, propertyType);
            ps.setArray(7, imageArray);
            ps.setObject(8, extra.get("latitude"));
            ps.setObject(9, extra.get("longitude"));
            ps.setObject(10, extra.get("bedrooms"));
            ps.setObject(11, extra.get("max_guests"));
            ps.setObject(12, extra.get("virtual_tour_url"));
            ps.setObject(13, extra.get("wave_payment_url"));
            ps.setObject(14, extra.get("orange_money_url"));
            Object active = extra.get("is_active");
            ps.setObject(15, active instanceof Boolean b ? b : Boolean.TRUE);
            Array amenityArray = conn.createArrayOf("text", toTextArray(extra.get("amenities")));
            ps.setArray(16, amenityArray);
            ps.setObject(17, extra.get("check_in_time"));
            ps.setObject(18, extra.get("check_out_time"));
            ps.setObject(19, extra.get("price_midday"));
            ps.setObject(20, extra.get("price_full_day"));
            try (var rs = ps.executeQuery()) {
              if (rs.next()) return RowMaps.property(rs);
              throw new IllegalStateException("Insert failed");
            }
          }
        });
  }

  public Map<String, Object> update(UUID id, Map<String, Object> data) {
    List<String> keys =
        List.of(
            "title",
            "description",
            "price",
            "location",
            "property_type",
            "images",
            "is_active",
            "latitude",
            "longitude",
            "bedrooms",
            "max_guests",
            "virtual_tour_url",
            "wave_payment_url",
            "orange_money_url",
            "amenities",
            "check_in_time",
            "check_out_time",
            "price_midday",
            "price_full_day");
    List<String> updateKeys = new ArrayList<>();
    List<Object> updateValues = new ArrayList<>();
    for (String key : keys) {
      if (data.containsKey(key)) {
        updateKeys.add(key);
        updateValues.add(data.get(key));
      }
    }
    if (updateKeys.isEmpty()) {
      return findById(id).orElse(null);
    }
    return jdbc.execute(
        (Connection conn) -> {
          List<String> sets =
              updateKeys.stream()
                  .map(k -> k.endsWith("_time") ? k + " = CAST(? AS time)" : k + " = ?")
                  .toList();
          String sql = "UPDATE properties SET " + String.join(", ", sets) + " WHERE id = ? RETURNING *";
          try (var ps = conn.prepareStatement(sql)) {
            int idx = 1;
            for (int i = 0; i < updateValues.size(); i++) {
              Object v = updateValues.get(i);
              if (("images".equals(updateKeys.get(i)) || "amenities".equals(updateKeys.get(i)))) {
                ps.setArray(idx++, conn.createArrayOf("text", toTextArray(v)));
              } else {
                ps.setObject(idx++, v);
              }
            }
            ps.setObject(idx, id);
            try (var rs = ps.executeQuery()) {
              if (rs.next()) return RowMaps.property(rs);
              return null;
            }
          }
        });
  }

  public boolean remove(UUID id) {
    return jdbc.update("DELETE FROM properties WHERE id = ?", id) > 0;
  }

  private static String[] toTextArray(Object raw) {
    if (raw instanceof List<?> list) {
      return list.stream()
          .filter(item -> item != null && !item.toString().isBlank())
          .map(item -> item.toString().trim())
          .toArray(String[]::new);
    }
    if (raw instanceof String text && !text.isBlank()) {
      return java.util.Arrays.stream(text.split(","))
          .map(String::trim)
          .filter(part -> !part.isEmpty())
          .toArray(String[]::new);
    }
    return new String[0];
  }

  public List<String> allImageUrls() {
    return jdbc.query(
        "SELECT unnest(images) AS url FROM properties WHERE images IS NOT NULL",
        (rs, rowNum) -> rs.getString("url"));
  }
}
