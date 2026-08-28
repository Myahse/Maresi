package com.maresi.api.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class DatabaseConfig {

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
  public DataSource dataSource(DataSourceProperties props) {
    ParsedJdbc parsed = parse(firstNonBlank(databaseUrl, props.getUrl()));
    DataSourceBuilder<?> builder =
        DataSourceBuilder.create()
            .url(parsed.jdbcUrl())
            .driverClassName("org.postgresql.Driver");
    if (!parsed.username().isBlank()) {
      builder.username(parsed.username());
    } else if (props.getUsername() != null) {
      builder.username(props.getUsername());
    }
    if (parsed.password() != null) {
      builder.password(parsed.password());
    } else if (props.getPassword() != null) {
      builder.password(props.getPassword());
    }
    return builder.build();
  }

  static ParsedJdbc parse(String raw) {
    if (raw == null || raw.isBlank()) {
      throw new IllegalStateException("DATABASE_URL is missing");
    }
    String url = stripQuotes(raw.trim());
    if (url.startsWith("jdbc:postgresql://")) {
      return new ParsedJdbc(url, "", null);
    }
    if (url.startsWith("postgres://")) {
      url = "postgresql://" + url.substring("postgres://".length());
    }
    if (!url.startsWith("postgresql://")) {
      throw new IllegalStateException(
          "DATABASE_URL must be a postgres URI or jdbc:postgresql:// URL");
    }

    String rest = url.substring("postgresql://".length());
    int at = rest.lastIndexOf('@');
    if (at < 0) {
      throw new IllegalStateException("DATABASE_URL is missing user@host");
    }
    String userInfo = rest.substring(0, at);
    String hostAndDb = rest.substring(at + 1);

    String username = userInfo;
    String password = "";
    int colon = userInfo.indexOf(':');
    if (colon >= 0) {
      username = decode(userInfo.substring(0, colon));
      password = decode(userInfo.substring(colon + 1));
    } else {
      username = decode(userInfo);
    }

    String hostPortDb = hostAndDb;
    String query = "";
    int q = hostAndDb.indexOf('?');
    if (q >= 0) {
      hostPortDb = hostAndDb.substring(0, q);
      query = hostAndDb.substring(q + 1);
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
    int portSep = hostPort.lastIndexOf(':');
    if (portSep >= 0 && !hostPort.startsWith("[")) {
      host = hostPort.substring(0, portSep);
      try {
        port = Integer.parseInt(hostPort.substring(portSep + 1));
      } catch (NumberFormatException ignored) {
        host = hostPort;
        port = 5432;
      }
    }

    if (host == null || host.isBlank()) {
      // Fallback for odd URIs
      URI uri = URI.create("http://" + rest);
      host = uri.getHost();
      if (uri.getPort() > 0) port = uri.getPort();
    }

    String jdbc = "jdbc:postgresql://" + host + ":" + port + "/" + db;
    if (query.isBlank()) {
      jdbc = ensureSsl(jdbc);
    } else if (!query.contains("sslmode=")) {
      jdbc = jdbc + "?" + query + "&sslmode=require";
    } else {
      jdbc = jdbc + "?" + query;
    }
    return new ParsedJdbc(jdbc, username, password);
  }

  private static String ensureSsl(String jdbcUrl) {
    if (jdbcUrl.contains("sslmode=")) return jdbcUrl;
    return jdbcUrl.contains("?") ? jdbcUrl + "&sslmode=require" : jdbcUrl + "?sslmode=require";
  }

  private static String firstNonBlank(String a, String b) {
    if (a != null && !a.isBlank()) return a;
    return b;
  }

  private static String stripQuotes(String s) {
    if (s.length() >= 2 && ((s.startsWith("\"") && s.endsWith("\"")) || (s.startsWith("'") && s.endsWith("'")))) {
      return s.substring(1, s.length() - 1);
    }
    return s;
  }

  private static String decode(String s) {
    return URLDecoder.decode(s, StandardCharsets.UTF_8);
  }

  record ParsedJdbc(String jdbcUrl, String username, String password) {}
}
