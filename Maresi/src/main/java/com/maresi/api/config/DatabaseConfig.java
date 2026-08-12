package com.maresi.api.config;

import java.net.URI;
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
  if (databaseUrl != null && databaseUrl.startsWith("postgresql://")) {
      try {
        URI uri = URI.create(databaseUrl.replace("postgresql://", "http://"));
        String host = uri.getHost();
        int port = uri.getPort() > 0 ? uri.getPort() : 5432;
        String path = uri.getPath();
        String db = path != null && path.length() > 1 ? path.substring(1) : "Maresi";
        String userInfo = uri.getUserInfo();
        String user = "";
        String pass = "";
        if (userInfo != null && userInfo.contains(":")) {
          String[] parts = userInfo.split(":", 2);
          user = parts[0];
          pass = parts.length > 1 ? parts[1] : "";
        } else if (userInfo != null) {
          user = userInfo;
        }
        return DataSourceBuilder.create()
            .url("jdbc:postgresql://" + host + ":" + port + "/" + db)
            .username(user)
            .password(pass)
            .driverClassName("org.postgresql.Driver")
            .build();
      } catch (Exception ignored) {
        // fall through to spring.datasource.*
      }
    }
    return props.initializeDataSourceBuilder().build();
  }
}
