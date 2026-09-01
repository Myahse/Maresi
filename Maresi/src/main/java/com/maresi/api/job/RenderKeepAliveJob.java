package com.maresi.api.job;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Hits the public health URL so Render counts inbound HTTP and does not spin the free web
 * service down for inactivity. Does nothing locally unless {@code MARESI_KEEPALIVE_URL} is set.
 * A sleeping instance still needs an external ping (GitHub Action) to wake up.
 */
@Component
public class RenderKeepAliveJob {
  private static final Logger log = LoggerFactory.getLogger(RenderKeepAliveJob.class);

  private final Environment env;
  private final String configuredUrl;
  private final HttpClient http =
      HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

  public RenderKeepAliveJob(
      Environment env, @Value("${maresi.keepalive.url:}") String configuredUrl) {
    this.env = env;
    this.configuredUrl = configuredUrl == null ? "" : configuredUrl.trim();
  }

  @Scheduled(fixedDelay = 300_000, initialDelay = 45_000)
  public void ping() {
    String url = resolveUrl();
    if (url.isBlank()) {
      return;
    }
    try {
      HttpRequest request =
          HttpRequest.newBuilder(URI.create(url))
              .timeout(Duration.ofSeconds(20))
              .header("User-Agent", "Maresi-RenderKeepAlive")
              .GET()
              .build();
      HttpResponse<Void> response = http.send(request, HttpResponse.BodyHandlers.discarding());
      if (response.statusCode() >= 400) {
        log.warn("Render keep-alive HTTP {} from {}", response.statusCode(), url);
      }
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      log.warn("Render keep-alive interrupted: {}", e.getMessage());
    } catch (Exception e) {
      log.warn("Render keep-alive failed: {}", e.getMessage());
    }
  }

  private String resolveUrl() {
    if (!configuredUrl.isBlank()) {
      return configuredUrl;
    }
    String renderUrl = env.getProperty("RENDER_EXTERNAL_URL", "").trim();
    if (renderUrl.isBlank()) {
      return "";
    }
    if (renderUrl.endsWith("/")) {
      renderUrl = renderUrl.substring(0, renderUrl.length() - 1);
    }
    return renderUrl + "/api/health";
  }
}
