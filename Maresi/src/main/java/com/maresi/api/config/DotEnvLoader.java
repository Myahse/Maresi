package com.maresi.api.config;

import java.io.BufferedReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Loads {@code .env} into system properties so local {@code mvn spring-boot:run} / IDE
 * launches pick up {@code DATABASE_URL}. Existing OS environment variables win (Render).
 */
public final class DotEnvLoader {
  private static final Logger log = LoggerFactory.getLogger(DotEnvLoader.class);

  private DotEnvLoader() {}

  public static void load() {
    Path file = find();
    if (file == null) {
      return;
    }
    int applied = 0;
    java.util.ArrayList<String> keys = new java.util.ArrayList<>();
    try (BufferedReader reader = Files.newBufferedReader(file, StandardCharsets.UTF_8)) {
      String line;
      while ((line = reader.readLine()) != null) {
        String trimmed = line.trim();
        if (trimmed.isEmpty() || trimmed.startsWith("#")) {
          continue;
        }
        int eq = trimmed.indexOf('=');
        if (eq <= 0) {
          continue;
        }
        String key = trimmed.substring(0, eq).trim();
        String value = stripQuotes(trimmed.substring(eq + 1).trim());
        if (key.isEmpty()) {
          continue;
        }
        String existingEnv = System.getenv(key);
        if (existingEnv != null && !existingEnv.isBlank()) {
          continue;
        }
        if (System.getProperty(key) != null) {
          continue;
        }
        System.setProperty(key, value);
        keys.add(key);
        applied++;
      }
      log.info("Loaded {} entries from {} ({})", applied, file.toAbsolutePath().normalize(), String.join(", ", keys));
    } catch (Exception e) {
      log.warn("Could not load {}: {}", file, e.getMessage());
    }
  }

  private static Path find() {
    List<Path> candidates =
        List.of(Path.of(".env"), Path.of("Maresi/.env"), Path.of("../.env"));
    for (Path p : candidates) {
      if (Files.isRegularFile(p)) {
        return p;
      }
    }
    return null;
  }

  private static String stripQuotes(String s) {
    if (s.length() >= 2
        && ((s.startsWith("\"") && s.endsWith("\"")) || (s.startsWith("'") && s.endsWith("'")))) {
      return s.substring(1, s.length() - 1);
    }
    return s;
  }
}
