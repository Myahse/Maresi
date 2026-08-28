package com.maresi.api.config;

import com.zaxxer.hikari.HikariDataSource;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class DatabaseConfig {
  private static final Logger log = LoggerFactory.getLogger(DatabaseConfig.class);

  @Value("${DATABASE_URL:}")
  private String databaseUrl;

  @Bean
  @Primary
  @ConfigurationProperties("spring.datasource")
  public DataSourceProperties dataSourceProperties() {
    return new DataSourceProperties();
  }

  @Bean
  @Primary
  @ConfigurationProperties("spring.datasource.hikari")
  public HikariDataSource dataSource(DataSourceProperties props) {
    ParsedJdbc parsed = parse(firstNonBlank(databaseUrl, props.getUrl()));
    HikariDataSource ds = new HikariDataSource();
    ds.setJdbcUrl(parsed.jdbcUrl());
    ds.setDriverClassName("org.postgresql.Driver");
    String username = firstNonBlank(parsed.username(), props.getUsername());
    if (username != null && !username.isBlank()) {
      ds.setUsername(username);
    }
    if (parsed.password() != null) {
      ds.setPassword(parsed.password());
    } else if (props.getPassword() != null) {
      ds.setPassword(props.getPassword());
    }
    log.info("JDBC URL {} user={}", redact(parsed.jdbcUrl()), ds.getUsername());
    return ds;
  }

  static ParsedJdbc parse(String raw) {
    if (raw == null || raw.isBlank()) {
      throw new IllegalStateException("DATABASE_URL is missing");
    }
    String url = stripQuotes(raw.trim());
    boolean jdbc = url.toLowerCase(Locale.ROOT).startsWith("jdbc:");
    if (jdbc) {
      url = url.substring("jdbc:".length());
    }
    if (url.startsWith("postgres://")) {
      url = "postgresql://" + url.substring("postgres://".length());
    }
    if (!url.startsWith("postgresql://")) {
      throw new IllegalStateException(
          "DATABASE_URL must be a postgres URI or jdbc:postgresql:// URL");
    }

    String rest = url.substring("postgresql://".length());
    String username = "";
    String password = null;
    int at = rest.lastIndexOf('@');
    String hostAndDb = rest;
    if (at >= 0) {
      String userInfo = rest.substring(0, at);
      hostAndDb = rest.substring(at + 1);
      int colon = userInfo.indexOf(':');
      if (colon >= 0) {
        username = decode(userInfo.substring(0, colon));
        password = decode(userInfo.substring(colon + 1));
      } else {
        username = decode(userInfo);
      }
    }

    String query = "";
    int q = hostAndDb.indexOf('?');
    String hostPortDb = hostAndDb;
    if (q >= 0) {
      hostPortDb = hostAndDb.substring(0, q);
      query = hostAndDb.substring(q + 1);
    }

    Map<String, String> params = parseQuery(query);
    if (params.containsKey("user") && username.isBlank()) {
      username = params.remove("user");
    } else {
      params.remove("user");
    }
    if (params.containsKey("password")) {
      if (password == null) {
        password = params.remove("password");
      } else {
        params.remove("password");
      }
    }

    String hostPort;
    String db = "neondb";
    int slash = hostPortDb.indexOf('/');
    if (slash >= 0) {
      hostPort = hostPortDb.substring(0, slash);
      db = hostPortDb.substring(slash + 1);
      if (db.isBlank()) db = "neondb";
    } else {
      hostPort = hostPortDb;
    }

    String host = hostPort;
    int port = 5432;
    if (hostPort.startsWith("[")) {
      int end = hostPort.indexOf(']');
      if (end > 0) {
        host = hostPort.substring(1, end);
        if (end + 1 < hostPort.length() && hostPort.charAt(end + 1) == ':') {
          port = parsePort(hostPort.substring(end + 2), 5432);
        }
      }
    } else {
      int portSep = hostPort.lastIndexOf(':');
      if (portSep >= 0) {
        host = hostPort.substring(0, portSep);
        port = parsePort(hostPort.substring(portSep + 1), 5432);
      }
    }
    if (host == null || host.isBlank()) {
      throw new IllegalStateException("DATABASE_URL is missing host");
    }

    boolean local = isLocal(host);
    boolean pooler = host.contains("-pooler") || host.contains("neon.tech");

    if (params.containsKey("channel_binding") && !params.containsKey("channelBinding")) {
      params.put("channelBinding", params.get("channel_binding"));
    }
    params.remove("channel_binding");
    // pgjdbc default is prefer. Neon's libpq URIs send require, which fails on
    // older drivers / PgBouncer when SCRAM-SHA-256-PLUS is not available.
    if ("require".equalsIgnoreCase(params.get("channelBinding"))) {
      params.put("channelBinding", "prefer");
    }

    if (!local) {
      params.putIfAbsent("sslmode", "require");
    }
    if (pooler && !local) {
      params.putIfAbsent("prepareThreshold", "0");
    }

    StringBuilder jdbcUrl = new StringBuilder("jdbc:postgresql://")
        .append(host)
        .append(':')
        .append(port)
        .append('/')
        .append(db);
    if (!params.isEmpty()) {
      jdbcUrl.append('?').append(joinQuery(params));
    }
    return new ParsedJdbc(jdbcUrl.toString(), username, password);
  }

  private static boolean isLocal(String host) {
    return "localhost".equalsIgnoreCase(host)
        || "127.0.0.1".equals(host)
        || "::1".equals(host);
  }

  private static int parsePort(String raw, int fallback) {
    try {
      return Integer.parseInt(raw);
    } catch (NumberFormatException ignored) {
      return fallback;
    }
  }

  private static Map<String, String> parseQuery(String query) {
    Map<String, String> params = new LinkedHashMap<>();
    if (query == null || query.isBlank()) return params;
    for (String part : query.split("&")) {
      if (part.isBlank()) continue;
      int eq = part.indexOf('=');
      if (eq < 0) {
        params.put(decode(part), "");
      } else {
        params.put(decode(part.substring(0, eq)), decode(part.substring(eq + 1)));
      }
    }
    return params;
  }

  private static String joinQuery(Map<String, String> params) {
    StringBuilder sb = new StringBuilder();
    for (Map.Entry<String, String> e : params.entrySet()) {
      if (sb.length() > 0) sb.append('&');
      sb.append(e.getKey());
      if (e.getValue() != null && !e.getValue().isEmpty()) {
        sb.append('=').append(e.getValue());
      }
    }
    return sb.toString();
  }

  private static String firstNonBlank(String a, String b) {
    if (a != null && !a.isBlank()) return a;
    return b;
  }

  private static String stripQuotes(String s) {
    if (s.length() >= 2
        && ((s.startsWith("\"") && s.endsWith("\"")) || (s.startsWith("'") && s.endsWith("'")))) {
      return s.substring(1, s.length() - 1);
    }
    return s;
  }

  private static String decode(String s) {
    return URLDecoder.decode(s, StandardCharsets.UTF_8);
  }

  private static String redact(String jdbcUrl) {
    return jdbcUrl.replaceAll("(?i)(password=)[^&]+", "$1***");
  }

  record ParsedJdbc(String jdbcUrl, String username, String password) {}
}
