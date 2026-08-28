package com.maresi.api.repository;

import java.math.BigDecimal;
import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class RowMaps {
  private RowMaps() {}

  public static Map<String, Object> userPublic(ResultSet rs) throws SQLException {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", rs.getObject("id"));
    m.put("email", rs.getString("email"));
    m.put("full_name", rs.getString("full_name"));
    m.put("role", rs.getString("role"));
    m.put("phone", rs.getString("phone"));
    return m;
  }

  public static Map<String, Object> property(ResultSet rs) throws SQLException {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", rs.getObject("id"));
    m.put("owner_id", rs.getObject("owner_id"));
    m.put("title", rs.getString("title"));
    m.put("description", rs.getString("description"));
    m.put("price", rs.getBigDecimal("price"));
    m.put("location", rs.getString("location"));
    m.put("property_type", rs.getString("property_type"));
    m.put("images", readTextArray(rs, "images"));
    m.put("is_active", rs.getBoolean("is_active"));
    putIfPresent(rs, m, "latitude");
    putIfPresent(rs, m, "longitude");
    putIfPresent(rs, m, "virtual_tour_url");
    putIfPresent(rs, m, "average_rating");
    putIfPresent(rs, m, "rating_count");
    putIfPresent(rs, m, "bedrooms");
    putIfPresent(rs, m, "max_guests");
    m.put("created_at", toIso(rs.getTimestamp("created_at")));
    m.put("updated_at", toIso(rs.getTimestamp("updated_at")));
    putIfPresent(rs, m, "owner_name");
    putIfPresent(rs, m, "owner_email");
    putIfPresent(rs, m, "owner_phone");
    return m;
  }

  public static Map<String, Object> favorite(ResultSet rs) throws SQLException {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", rs.getObject("id"));
    m.put("property_id", rs.getObject("property_id"));
    m.put("created_at", toIso(rs.getTimestamp("created_at")));
    m.put("title", rs.getString("title"));
    m.put("price", rs.getBigDecimal("price"));
    m.put("location", rs.getString("location"));
    m.put("property_type", rs.getString("property_type"));
    m.put("images", readTextArray(rs, "images"));
    return m;
  }

  public static Map<String, Object> notification(ResultSet rs) throws SQLException {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", rs.getObject("id"));
    m.put("user_id", rs.getObject("user_id"));
    m.put("type", rs.getString("type"));
    m.put("title", rs.getString("title"));
    m.put("message", rs.getString("message"));
    m.put("property_id", rs.getObject("property_id"));
    m.put("read_at", toIso(rs.getTimestamp("read_at")));
    m.put("created_at", toIso(rs.getTimestamp("created_at")));
    return m;
  }

  public static Map<String, Object> visitRequest(ResultSet rs) throws SQLException {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", rs.getObject("id"));
    m.put("user_id", rs.getObject("user_id"));
    m.put("property_id", rs.getObject("property_id"));
    m.put("message", rs.getString("message"));
    m.put("status", rs.getString("status"));
    m.put("requested_at", toIso(rs.getTimestamp("requested_at")));
    m.put("responded_at", toIso(rs.getTimestamp("responded_at")));
    putIfPresent(rs, m, "check_in");
    putIfPresent(rs, m, "check_out");
    putIfPresent(rs, m, "visit_date");
    putIfPresent(rs, m, "visit_time");
    putIfPresent(rs, m, "guests_count");
    putIfPresent(rs, m, "contact_phone");
    putIfPresent(rs, m, "id_card");
    putIfPresent(rs, m, "owner_note");
    putIfPresent(rs, m, "property_title");
    putIfPresent(rs, m, "location");
    putIfPresent(rs, m, "requester_name");
    putIfPresent(rs, m, "requester_email");
    return m;
  }

  public static Map<String, Object> payment(ResultSet rs) throws SQLException {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", rs.getObject("id"));
    m.put("user_id", rs.getObject("user_id"));
    m.put("type", rs.getString("type"));
    m.put("visit_request_id", rs.getObject("visit_request_id"));
    m.put("amount", rs.getBigDecimal("amount"));
    m.put("commission_amount", rs.getBigDecimal("commission_amount"));
    m.put("owner_amount", rs.getBigDecimal("owner_amount"));
    m.put("currency", rs.getString("currency"));
    m.put("status", rs.getString("status"));
    m.put("provider", rs.getString("provider"));
    m.put("provider_reference", rs.getString("provider_reference"));
    m.put("checkout_url", rs.getString("checkout_url"));
    m.put("created_at", toIso(rs.getTimestamp("created_at")));
    m.put("updated_at", toIso(rs.getTimestamp("updated_at")));
    return m;
  }

  public static Map<String, Object> ownerSubscription(ResultSet rs) throws SQLException {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", rs.getObject("id"));
    m.put("user_id", rs.getObject("user_id"));
    m.put("status", rs.getString("status"));
    m.put("starts_at", toIso(rs.getTimestamp("starts_at")));
    m.put("expires_at", toIso(rs.getTimestamp("expires_at")));
    m.put("last_payment_id", rs.getObject("last_payment_id"));
    m.put("created_at", toIso(rs.getTimestamp("created_at")));
    m.put("updated_at", toIso(rs.getTimestamp("updated_at")));
    return m;
  }

  public static Map<String, Object> hostApplication(ResultSet rs) throws SQLException {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", rs.getObject("id"));
    m.put("user_id", rs.getObject("user_id"));
    m.put("full_name", rs.getString("full_name"));
    m.put("phone", rs.getString("phone"));
    m.put("city", rs.getString("city"));
    m.put("message", rs.getString("message"));
    m.put("id_card", rs.getString("id_card"));
    m.put("status", rs.getString("status"));
    m.put("admin_note", rs.getString("admin_note"));
    m.put("reviewed_by", rs.getObject("reviewed_by"));
    m.put("reviewed_at", toIso(rs.getTimestamp("reviewed_at")));
    m.put("created_at", toIso(rs.getTimestamp("created_at")));
    m.put("updated_at", toIso(rs.getTimestamp("updated_at")));
    putIfPresent(rs, m, "user_email");
    return m;
  }

  private static void putIfPresent(ResultSet rs, Map<String, Object> m, String col) throws SQLException {
    try {
      Object v = rs.getObject(col);
      if (!rs.wasNull()) m.put(col, v instanceof BigDecimal ? v : v);
    } catch (SQLException ignored) {
      // column not in result set
    }
  }

  private static List<String> readTextArray(ResultSet rs, String col) throws SQLException {
    Array arr = rs.getArray(col);
    if (arr == null) return List.of();
    Object raw = arr.getArray();
    if (raw instanceof String[] strings) return List.of(strings);
    return List.of();
  }

  private static String toIso(Timestamp ts) {
    if (ts == null) return null;
    return ts.toInstant().toString();
  }
}
