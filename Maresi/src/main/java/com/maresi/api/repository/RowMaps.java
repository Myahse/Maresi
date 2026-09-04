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
    putIfPresent(rs, m, "first_name");
    putIfPresent(rs, m, "last_name");
    putDate(rs, m, "birth_date");
    putIfPresent(rs, m, "gender");
    m.put("role", rs.getString("role"));
    m.put("phone", rs.getString("phone"));
    putIfPresent(rs, m, "host_intent");
    putIfPresent(rs, m, "host_status");
    putIfPresent(rs, m, "email_verified");
    putIfPresent(rs, m, "created_at");
    putIfPresent(rs, m, "id_card");
    putIfPresent(rs, m, "selfie_url");
    putIfPresent(rs, m, "id_card_photo_url");
    putIfPresent(rs, m, "id_card_back_url");
    String status = null;
    try {
      status = rs.getString("account_status");
    } catch (SQLException ignored) {
    }
    m.put("account_status", status == null || status.isBlank() ? "ok" : status);
    putIfPresent(rs, m, "review_message");
    putTimestamp(rs, m, "review_requested_at");
    putTimestamp(rs, m, "identity_updated_at");
    return m;
  }

  public static Map<String, Object> userIdentity(ResultSet rs) throws SQLException {
    Map<String, Object> m = userPublic(rs);
    m.put("id_card", rs.getString("id_card"));
    m.put("selfie_url", rs.getString("selfie_url"));
    m.put("id_card_photo_url", rs.getString("id_card_photo_url"));
    m.put("id_card_back_url", rs.getString("id_card_back_url"));
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
    m.put("amenities", readTextArray(rs, "amenities"));
    m.put("is_active", rs.getBoolean("is_active"));
    putIfPresent(rs, m, "latitude");
    putIfPresent(rs, m, "longitude");
    putIfPresent(rs, m, "virtual_tour_url");
    putIfPresent(rs, m, "average_rating");
    putIfPresent(rs, m, "rating_count");
    putIfPresent(rs, m, "bedrooms");
    putIfPresent(rs, m, "max_guests");
    putIfPresent(rs, m, "wave_payment_url");
    putIfPresent(rs, m, "orange_money_url");
    putTime(rs, m, "check_in_time");
    putTime(rs, m, "check_out_time");
    putIfPresent(rs, m, "price_unit");
    putIfPresent(rs, m, "manager_name");
    putIfPresent(rs, m, "manager_phone");
    putIfPresent(rs, m, "manager_email");
    putIfPresent(rs, m, "manager_role");
    m.put("created_at", toIso(rs.getTimestamp("created_at")));
    m.put("updated_at", toIso(rs.getTimestamp("updated_at")));
    putIfPresent(rs, m, "owner_name");
    putIfPresent(rs, m, "owner_email");
    putIfPresent(rs, m, "owner_phone");
    m.put("premium_positioning", boolOrFalse(rs, "premium_positioning"));
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
    m.put("amenities", readTextArray(rs, "amenities"));
    putIfPresent(rs, m, "average_rating");
    putIfPresent(rs, m, "rating_count");
    putIfPresent(rs, m, "bedrooms");
    putIfPresent(rs, m, "max_guests");
    return m;
  }

  public static Map<String, Object> rating(ResultSet rs) throws SQLException {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", rs.getObject("id"));
    m.put("property_id", rs.getObject("property_id"));
    m.put("user_id", rs.getObject("user_id"));
    m.put("user_name", rs.getString("user_name"));
    m.put("score", rs.getInt("score"));
    m.put("comment", rs.getString("comment"));
    m.put("created_at", toIso(rs.getTimestamp("created_at")));
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
    putIfPresent(rs, m, "requester_phone");
    putIfPresent(rs, m, "requester_id_card");
    putIfPresent(rs, m, "requester_selfie_url");
    putIfPresent(rs, m, "requester_id_photo_url");
    putIfPresent(rs, m, "requester_id_back_url");
    putTime(rs, m, "check_in_time");
    putTime(rs, m, "check_out_time");
    putTime(rs, m, "arrival_time");
    putTime(rs, m, "departure_time");
    putIfPresent(rs, m, "agreement_full_name");
    putIfPresent(rs, m, "agreement_accepted");
    putTimestamp(rs, m, "agreement_signed_at");
    putIfPresent(rs, m, "host_agreement_full_name");
    putIfPresent(rs, m, "host_agreement_accepted");
    putTimestamp(rs, m, "host_agreement_signed_at");
    putIfPresent(rs, m, "key_code");
    putIfPresent(rs, m, "key_confirmed_at");
    putIfPresent(rs, m, "checkin_notified_at");
    putIfPresent(rs, m, "checkout_notified_at");
    putIfPresent(rs, m, "property_price");
    putIfPresent(rs, m, "property_owner_id");
    putIfPresent(rs, m, "wave_payment_url");
    putIfPresent(rs, m, "orange_money_url");
    putIfPresent(rs, m, "owner_phone");
    putDate(rs, m, "extension_check_out");
    putIfPresent(rs, m, "extension_status");
    putIfPresent(rs, m, "extension_amount");
    putIfPresent(rs, m, "extension_requested_at");
    putIfPresent(rs, m, "extension_responded_at");
    putIfPresent(rs, m, "extension_note");
    putIfPresent(rs, m, "closed_at");
    putTimestamp(rs, m, "chat_closed_at");
    putIfPresent(rs, m, "payment_receipt_url");
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
    putIfPresent(rs, m, "user_email");
    putIfPresent(rs, m, "user_name");
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
    putIfPresent(rs, m, "user_email");
    putIfPresent(rs, m, "user_name");
    putIfPresent(rs, m, "user_role");
    m.put("premium_positioning", boolOrFalse(rs, "premium_positioning"));
    return m;
  }

  public static Map<String, Object> wallet(ResultSet rs) throws SQLException {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("user_id", rs.getObject("user_id"));
    m.put("balance", rs.getBigDecimal("balance"));
    m.put("updated_at", toIso(rs.getTimestamp("updated_at")));
    return m;
  }

  public static Map<String, Object> walletLedger(ResultSet rs) throws SQLException {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", rs.getObject("id"));
    m.put("user_id", rs.getObject("user_id"));
    m.put("entry_type", rs.getString("entry_type"));
    m.put("direction", rs.getString("direction"));
    m.put("amount", rs.getBigDecimal("amount"));
    m.put("balance_after", rs.getBigDecimal("balance_after"));
    m.put("payment_id", rs.getObject("payment_id"));
    m.put("visit_request_id", rs.getObject("visit_request_id"));
    m.put("note", rs.getString("note"));
    m.put("created_at", toIso(rs.getTimestamp("created_at")));
    return m;
  }

  public static Map<String, Object> visitMessage(ResultSet rs) throws SQLException {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", rs.getObject("id"));
    m.put("visit_request_id", rs.getObject("visit_request_id"));
    m.put("sender_id", rs.getObject("sender_id"));
    m.put("body", rs.getString("body"));
    m.put("created_at", toIso(rs.getTimestamp("created_at")));
    putIfPresent(rs, m, "attachment_url");
    putIfPresent(rs, m, "attachment_name");
    putIfPresent(rs, m, "attachment_type");
    putIfPresent(rs, m, "sender_name");
    putIfPresent(rs, m, "sender_role");
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

  private static void putTimestamp(ResultSet rs, Map<String, Object> m, String col) {
    try {
      String iso = toIso(rs.getTimestamp(col));
      if (iso != null) m.put(col, iso);
    } catch (SQLException ignored) {
      // column not in result set
    }
  }

  private static void putDate(ResultSet rs, Map<String, Object> m, String col) {
    try {
      java.sql.Date date = rs.getDate(col);
      if (date != null) m.put(col, date.toLocalDate().toString());
    } catch (SQLException ignored) {
      // column not in result set
    }
  }

  private static void putTime(ResultSet rs, Map<String, Object> m, String col) {
    try {
      java.sql.Time time = rs.getTime(col);
      if (time != null) {
        m.put(col, time.toLocalTime().toString());
      }
    } catch (SQLException ignored) {
      // column not in result set
    }
  }

  private static boolean boolOrFalse(ResultSet rs, String col) {
    try {
      boolean value = rs.getBoolean(col);
      return !rs.wasNull() && value;
    } catch (SQLException ignored) {
      return false;
    }
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
    if (raw instanceof String[] strings) {
      return List.of(strings);
    }
    if (raw instanceof Object[] objects) {
      List<String> out = new ArrayList<>(objects.length);
      for (Object value : objects) {
        if (value == null) continue;
        String text = value.toString().trim();
        if (!text.isEmpty()) out.add(text);
      }
      return out;
    }
    return List.of();
  }

  private static String toIso(Timestamp ts) {
    if (ts == null) return null;
    return ts.toInstant().toString();
  }
}
