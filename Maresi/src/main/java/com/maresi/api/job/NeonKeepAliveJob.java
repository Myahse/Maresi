package com.maresi.api.job;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class NeonKeepAliveJob {
  private static final Logger log = LoggerFactory.getLogger(NeonKeepAliveJob.class);
  private final JdbcTemplate jdbc;

  public NeonKeepAliveJob(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @Scheduled(fixedDelay = 240_000, initialDelay = 20_000)
  public void ping() {
    try {
      jdbc.queryForObject("SELECT 1", Integer.class);
    } catch (Exception e) {
      log.warn("Database keep-alive failed: {}", e.getMessage());
    }
  }
}
