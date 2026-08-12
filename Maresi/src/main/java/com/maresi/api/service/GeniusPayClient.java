package com.maresi.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.maresi.api.config.AppProperties;
import com.maresi.api.exception.ApiException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Service;

@Service
public class GeniusPayClient {
  private final AppProperties props;
  private final ObjectMapper objectMapper;
  private final HttpClient httpClient;

  public GeniusPayClient(AppProperties props, ObjectMapper objectMapper) {
    this.props = props;
    this.objectMapper = objectMapper;
    this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(20)).build();
  }

  public Map<String, Object> createCheckoutPayment(
      BigDecimal amount,
      String description,
      Map<String, Object> customer,
      String successUrl,
      String errorUrl,
      Map<String, Object> metadata) {
    AppProperties.GeniusPay gp = props.getGeniuspay();
    if (gp.getApiKey() == null
        || gp.getApiKey().isBlank()
        || gp.getApiSecret() == null
        || gp.getApiSecret().isBlank()) {
      throw ApiException.of(503, "Genius Pay is not configured");
    }

    Map<String, Object> body = new LinkedHashMap<>();
    body.put("amount", amount);
    body.put("currency", "XOF");
    body.put("description", description);
    if (customer != null && !customer.isEmpty()) body.put("customer", customer);
    if (successUrl != null && !successUrl.isBlank()) body.put("success_url", successUrl);
    if (errorUrl != null && !errorUrl.isBlank()) body.put("error_url", errorUrl);
    if (metadata != null && !metadata.isEmpty()) body.put("metadata", metadata);

    try {
      String json = objectMapper.writeValueAsString(body);
      HttpRequest request =
          HttpRequest.newBuilder()
              .uri(URI.create(trimSlash(gp.getBaseUrl()) + "/payments"))
              .timeout(Duration.ofSeconds(30))
              .header("Content-Type", "application/json")
              .header("X-API-Key", gp.getApiKey())
              .header("X-API-Secret", gp.getApiSecret())
              .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
              .build();
      HttpResponse<String> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      if (response.statusCode() >= 400) {
        throw ApiException.of(502, "Genius Pay error: " + truncate(response.body()));
      }
      JsonNode root = objectMapper.readTree(response.body());
      JsonNode data = root.has("data") ? root.get("data") : root;
      Map<String, Object> result = new LinkedHashMap<>();
      result.put("reference", text(data, "reference", "id", "transaction_id"));
      result.put(
          "checkout_url",
          text(data, "checkout_url", "payment_url"));
      result.put("status", text(data, "status"));
      result.put("raw", objectMapper.convertValue(data, Map.class));
      if (result.get("checkout_url") == null || String.valueOf(result.get("checkout_url")).isBlank()) {
        throw ApiException.of(502, "Genius Pay did not return a checkout URL");
      }
      return result;
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      throw ApiException.of(502, "Genius Pay request failed: " + e.getMessage());
    }
  }

  public boolean verifyWebhookSignature(String rawBody, String signature, String timestamp) {
    String secret = props.getGeniuspay().getWebhookSecret();
    if (secret == null || secret.isBlank()) {
      return false;
    }
    if (signature == null || timestamp == null || rawBody == null) {
      return false;
    }
    try {
      String payload = timestamp + "." + rawBody;
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
      String expected = toHex(digest);
      String normalized = signature.startsWith("sha256=") ? signature.substring(7) : signature;
      return constantTimeEquals(expected, normalized);
    } catch (Exception e) {
      return false;
    }
  }

  private static String text(JsonNode node, String... keys) {
    if (node == null) return null;
    for (String key : keys) {
      JsonNode v = node.get(key);
      if (v != null && !v.isNull() && !v.asText().isBlank()) return v.asText();
    }
    return null;
  }

  private static String trimSlash(String url) {
    if (url == null) return "";
    return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
  }

  private static String truncate(String s) {
    if (s == null) return "";
    return s.length() > 200 ? s.substring(0, 200) : s;
  }

  private static String toHex(byte[] bytes) {
    StringBuilder sb = new StringBuilder(bytes.length * 2);
    for (byte b : bytes) sb.append(String.format("%02x", b));
    return sb.toString();
  }

  private static boolean constantTimeEquals(String a, String b) {
    if (a == null || b == null || a.length() != b.length()) return false;
    int result = 0;
    for (int i = 0; i < a.length(); i++) result |= a.charAt(i) ^ b.charAt(i);
    return result == 0;
  }
}
