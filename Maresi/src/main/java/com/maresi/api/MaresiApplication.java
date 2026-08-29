package com.maresi.api;

import com.maresi.api.config.AppProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
@EnableConfigurationProperties(AppProperties.class)
public class MaresiApplication {
  public static void main(String[] args) {
    SpringApplication.run(MaresiApplication.class, args);
  }
}
