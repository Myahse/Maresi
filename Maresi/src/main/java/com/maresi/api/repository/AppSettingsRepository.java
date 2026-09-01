package com.maresi.api.repository;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AppSettingsRepository {
  public static final String CLIENT_PAYS_OPERATOR_FEES = "client_pays_operator_fees";
  public static final String OPERATOR_FEE_PERCENT = "operator_fee_percent";

  private final JdbcTemplate jdbc;

  public AppSettingsRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public Map<String, String> all() {
    Map<String, String> out = new LinkedHashMap<>();
    jdbc.query(
        "SELECT key, value FROM app_settings",
        (rs) -> {
          out.put(rs.getString("key"), rs.getString("value"));
        });
    out.putIfAbsent(CLIENT_PAYS_OPERATOR_FEES, "false");
    out.putIfAbsent(OPERATOR_FEE_PERCENT, "1");
    return out;
  }

  public boolean clientPaysOperatorFees() {
    return isTrue(get(CLIENT_PAYS_OPERATOR_FEES, "false"));
  }

  public BigDecimal operatorFeePercent() {
    try {
      return new BigDecimal(get(OPERATOR_FEE_PERCENT, "1"));
    } catch (Exception e) {
      return BigDecimal.ONE;
    }
  }

  public void put(String key, String value) {
    jdbc.update(
        """
        INSERT INTO app_settings (key, value, updated_at)
        VALUES (?, ?, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        """,
        key,
        value);
  }

  private String get(String key, String fallback) {
    return jdbc
        .query(
            "SELECT value FROM app_settings WHERE key = ?",
            (rs, rowNum) -> rs.getString("value"),
            key)
        .stream()
        .findFirst()
        .orElse(fallback);
  }

  private static boolean isTrue(String value) {
    if (value == null) return false;
    String s = value.trim().toLowerCase();
    return "true".equals(s) || "1".equals(s) || "yes".equals(s);
  }
}
