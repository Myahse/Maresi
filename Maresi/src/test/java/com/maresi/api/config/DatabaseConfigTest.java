package com.maresi.api.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.maresi.api.config.DatabaseConfig.ParsedJdbc;
import org.junit.jupiter.api.Test;

class DatabaseConfigTest {

  @Test
  void convertsNeonPooledUriToJdbc() {
    ParsedJdbc parsed =
        DatabaseConfig.parse(
            "postgresql://neondb_owner:secret@ep-demo-pooler.us-west-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require");
    assertEquals("neondb_owner", parsed.username());
    assertEquals("secret", parsed.password());
    assertTrue(parsed.jdbcUrl().startsWith("jdbc:postgresql://ep-demo-pooler.us-west-2.aws.neon.tech:5432/neondb?"));
    assertTrue(parsed.jdbcUrl().contains("sslmode=require"));
    assertTrue(parsed.jdbcUrl().contains("prepareThreshold=0"));
    assertFalse(parsed.jdbcUrl().contains("channel_binding"));
    assertFalse(parsed.jdbcUrl().contains("channelBinding=require"));
  }

  @Test
  void acceptsPostgresScheme() {
    ParsedJdbc parsed =
        DatabaseConfig.parse("postgres://app:pw@ep-demo-pooler.us-east-2.aws.neon.tech/neondb");
    assertEquals("app", parsed.username());
    assertEquals("pw", parsed.password());
    assertTrue(parsed.jdbcUrl().contains("sslmode=require"));
  }

  @Test
  void extractsCredentialsFromJdbcQuery() {
    ParsedJdbc parsed =
        DatabaseConfig.parse(
            "jdbc:postgresql://ep-demo.us-west-2.aws.neon.tech/neondb?user=neondb_owner&password=secret&sslmode=require&channelBinding=require");
    assertEquals("neondb_owner", parsed.username());
    assertEquals("secret", parsed.password());
    assertFalse(parsed.jdbcUrl().contains("user="));
    assertFalse(parsed.jdbcUrl().contains("password="));
    assertTrue(parsed.jdbcUrl().contains("sslmode=require"));
  }

  @Test
  void leavesLocalJdbcWithoutSsl() {
    ParsedJdbc parsed = DatabaseConfig.parse("jdbc:postgresql://localhost:5432/Maresi");
    assertEquals("jdbc:postgresql://localhost:5432/Maresi", parsed.jdbcUrl());
    assertFalse(parsed.jdbcUrl().contains("sslmode"));
  }
}
