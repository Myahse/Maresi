package com.maresi.api.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SchemaPatches {
  private static final Logger log = LoggerFactory.getLogger(SchemaPatches.class);

  private static final String[] STATEMENTS = {
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS host_intent BOOLEAN NOT NULL DEFAULT FALSE",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) NOT NULL DEFAULT 'ok'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS review_message TEXT",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMPTZ",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS identity_updated_at TIMESTAMPTZ",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(120)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(120)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT TRUE",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS id_card_back_url VARCHAR(500)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS guest_rating_avg DECIMAL(3, 2) DEFAULT 0",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS guest_rating_count INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS location_label VARCHAR(255)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ",
    """
    ALTER TABLE owner_subscriptions
      ADD COLUMN IF NOT EXISTS premium_positioning BOOLEAN NOT NULL DEFAULT FALSE
    """,
    "ALTER TABLE properties ADD COLUMN IF NOT EXISTS check_in_time TIME",
    "ALTER TABLE properties ADD COLUMN IF NOT EXISTS check_out_time TIME",
    "ALTER TABLE properties ADD COLUMN IF NOT EXISTS price_midday NUMERIC(12, 2)",
    "ALTER TABLE properties ADD COLUMN IF NOT EXISTS price_full_day NUMERIC(12, 2)",
    "ALTER TABLE visit_requests ADD COLUMN IF NOT EXISTS stay_rate VARCHAR(20) DEFAULT 'night'",
    "ALTER TABLE visit_requests ADD COLUMN IF NOT EXISTS arrival_time TIME",
    "ALTER TABLE visit_requests ADD COLUMN IF NOT EXISTS departure_time TIME",
    "ALTER TABLE visit_requests ADD COLUMN IF NOT EXISTS checkin_notified_at TIMESTAMPTZ",
    "ALTER TABLE visit_requests ADD COLUMN IF NOT EXISTS checkout_notified_at TIMESTAMPTZ",
    "ALTER TABLE visit_requests ADD COLUMN IF NOT EXISTS extension_check_out DATE",
    "ALTER TABLE visit_requests ADD COLUMN IF NOT EXISTS extension_status VARCHAR(20)",
    "ALTER TABLE visit_requests ADD COLUMN IF NOT EXISTS extension_amount NUMERIC(12, 2)",
    "ALTER TABLE visit_requests ADD COLUMN IF NOT EXISTS extension_requested_at TIMESTAMPTZ",
    "ALTER TABLE visit_requests ADD COLUMN IF NOT EXISTS extension_responded_at TIMESTAMPTZ",
    "ALTER TABLE visit_requests ADD COLUMN IF NOT EXISTS extension_note TEXT",
    "ALTER TABLE visit_requests ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ",
    "ALTER TABLE visit_requests ADD COLUMN IF NOT EXISTS host_agreement_full_name VARCHAR(200)",
    "ALTER TABLE visit_requests ADD COLUMN IF NOT EXISTS host_agreement_accepted BOOLEAN",
    "ALTER TABLE visit_requests ADD COLUMN IF NOT EXISTS host_agreement_signed_at TIMESTAMPTZ",
    "ALTER TABLE properties ADD COLUMN IF NOT EXISTS manager_name VARCHAR(200)",
    "ALTER TABLE properties ADD COLUMN IF NOT EXISTS manager_phone VARCHAR(50)",
    "ALTER TABLE properties ADD COLUMN IF NOT EXISTS manager_email VARCHAR(200)",
    "ALTER TABLE properties ADD COLUMN IF NOT EXISTS manager_role VARCHAR(80)",
    "UPDATE properties SET property_type = 'villa' WHERE property_type = 'house'",
    "UPDATE properties SET property_type = 'apartment' WHERE property_type = 'residence'",
  };

  private final JdbcTemplate jdbc;

  public SchemaPatches(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @PostConstruct
  void apply() {
    for (String sql : STATEMENTS) {
      try {
        jdbc.execute(sql);
      } catch (DataAccessException e) {
        Throwable cause = e.getMostSpecificCause();
        log.warn(
            "Schema patch skipped: {} — {}",
            sql.replaceAll("\\s+", " ").trim(),
            cause != null ? cause.getMessage() : e.getMessage());
      }
    }
    try {
      jdbc.update(
          """
          UPDATE owner_subscriptions
          SET premium_positioning = TRUE
          WHERE status = 'active'
            AND expires_at IS NOT NULL
            AND expires_at > NOW()
          """);
    } catch (DataAccessException e) {
      Throwable cause = e.getMostSpecificCause();
      log.warn(
          "Could not backfill owner_subscriptions.premium_positioning: {}",
          cause != null ? cause.getMessage() : e.getMessage());
    }
  }
}
