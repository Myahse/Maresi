package com.maresi.api.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class SchemaPatches {
  private static final Logger log = LoggerFactory.getLogger(SchemaPatches.class);
  private final JdbcTemplate jdbc;

  public SchemaPatches(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @PostConstruct
  void apply() {
    try {
      jdbc.execute(
          "ALTER TABLE users ADD COLUMN IF NOT EXISTS host_intent BOOLEAN NOT NULL DEFAULT FALSE");
    } catch (DataAccessException e) {
      Throwable cause = e.getMostSpecificCause();
      log.warn(
          "Could not add users.host_intent: {}",
          cause != null ? cause.getMessage() : e.getMessage());
    }
  }
}
