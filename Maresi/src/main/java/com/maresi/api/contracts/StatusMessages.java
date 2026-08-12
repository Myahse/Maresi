package com.maresi.api.contracts;

import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Properties;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

@Component
public class StatusMessages {
  private final Properties fallback;

  public StatusMessages() {
    fallback = load("errorMessage.properties");
    merge(load("errorMessage_fr.properties"));
    merge(load("errorMessage_en.properties"));
  }

  public String get(String key, Locale locale) {
    if (key == null) return "";
    Properties localized = load(bundleName(locale));
    String value = localized.getProperty(key);
    if (value == null || value.isBlank()) {
      value = fallback.getProperty(key);
    }
    return value != null ? value : key;
  }

  private static String bundleName(Locale locale) {
    if (locale == null) return "errorMessage_fr.properties";
    String language = locale.getLanguage();
    if ("en".equalsIgnoreCase(language)) {
      if ("US".equalsIgnoreCase(locale.getCountry())) return "errorMessage_en_US.properties";
      return "errorMessage_en.properties";
    }
    return "errorMessage_fr.properties";
  }

  private static Properties load(String fileName) {
    Properties properties = new Properties();
    try {
      ClassPathResource resource = new ClassPathResource(fileName);
      if (!resource.exists()) return properties;
      try (InputStreamReader reader =
          new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8)) {
        properties.load(reader);
      }
    } catch (IOException ignored) {
      // Keep empty bundle; fallback handles missing files.
    }
    return properties;
  }

  private void merge(Properties other) {
    fallback.putAll(other);
  }
}
