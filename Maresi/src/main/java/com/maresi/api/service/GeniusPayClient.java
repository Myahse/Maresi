package com.maresi.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.maresi.api.config.AppProperties;
import com.maresi.api.exception.ApiException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
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
    return createCheckoutPayment(amount, description, customer, successUrl, errorUrl, metadata, false, null);
  }

  public Map<String, Object> createCheckoutPayment(
      BigDecimal amount,
      String description,
      Map<String, Object> customer,
      String successUrl,
      String errorUrl,
      Map<String, Object> metadata,
      boolean customerPaysOperatorFees) {
    return createCheckoutPayment(amount, description, customer, successUrl, errorUrl, metadata, customerPaysOperatorFees, null);
  }

  public Map<String, Object> createCheckoutPayment(
      BigDecimal amount,
      String description,
      Map<String, Object> customer,
      String successUrl,
      String errorUrl,
      Map<String, Object> metadata,
      boolean customerPaysOperatorFees,
      String paymentMethod) {
    AppProperties.GeniusPay gp = requireKeys();

    Map<String, Object> body = new LinkedHashMap<>();
    body.put("amount", amount.setScale(0, java.math.RoundingMode.UP).longValue());
    body.put("currency", "XOF");
    body.put("description", description);
    if (customer != null && !customer.isEmpty()) body.put("customer", customer);
    if (successUrl != null && !successUrl.isBlank()) body.put("success_url", successUrl);
    if (errorUrl != null && !errorUrl.isBlank()) body.put("error_url", errorUrl);
    if (metadata != null && !metadata.isEmpty()) body.put("metadata", metadata);
    if (customerPaysOperatorFees) {
      body.put("fees_on_customer", true);
      body.put("customer_pays_fees", true);
    }
    if (paymentMethod != null && !paymentMethod.isBlank()) {
      body.put("payment_method", paymentMethod);
    }

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
      result.put("checkout_url", text(data, "checkout_url", "payment_url"));
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

  public Map<String, Object> getPayment(String reference) {
    AppProperties.GeniusPay gp = requireKeys();
    if (reference == null || reference.isBlank()) {
      throw ApiException.of(400, "Genius Pay reference is missing");
    }
    try {
      String encoded = URLEncoder.encode(reference, StandardCharsets.UTF_8).replace("+", "%20");
      HttpRequest request =
          HttpRequest.newBuilder()
              .uri(URI.create(trimSlash(gp.getBaseUrl()) + "/payments/" + encoded))
              .timeout(Duration.ofSeconds(30))
              .header("X-API-Key", gp.getApiKey())
              .header("X-API-Secret", gp.getApiSecret())
              .GET()
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
      result.put("status", text(data, "status"));
      result.put("raw", objectMapper.convertValue(data, Map.class));
      return result;
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      throw ApiException.of(502, "Genius Pay lookup failed: " + e.getMessage());
    }
  }

  public boolean refundPayment(String reference) {
    return refundPayment(reference, null);
  }

  public boolean refundPayment(String reference, BigDecimal amount) {
    if (reference == null || reference.isBlank()) return false;
    try {
      AppProperties.GeniusPay gp = requireKeys();
      String encoded = URLEncoder.encode(reference, StandardCharsets.UTF_8).replace("+", "%20");
      Map<String, Object> body = new LinkedHashMap<>();
      if (amount != null && amount.compareTo(BigDecimal.ZERO) > 0) {
        body.put("amount", amount);
      }
      String json = objectMapper.writeValueAsString(body);
      HttpRequest request =
          HttpRequest.newBuilder()
              .uri(URI.create(trimSlash(gp.getBaseUrl()) + "/payments/" + encoded + "/refund"))
              .timeout(Duration.ofSeconds(30))
              .header("Content-Type", "application/json")
              .header("X-API-Key", gp.getApiKey())
              .header("X-API-Secret", gp.getApiSecret())
              .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
              .build();
      HttpResponse<String> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      return response.statusCode() < 400;
    } catch (Exception e) {
      return false;
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

  private AppProperties.GeniusPay requireKeys() {
    AppProperties.GeniusPay gp = props.getGeniuspay();
    if (gp.getApiKey() == null
        || gp.getApiKey().isBlank()
        || gp.getApiSecret() == null
        || gp.getApiSecret().isBlank()) {
      throw ApiException.of(503, "Genius Pay is not configured");
    }
    return gp;
  }

  public Map<String, Object> createPayout(
      BigDecimal amount,
      String recipientName,
      String phone,
      String provider,
      String description,
      String idempotencyKey,
      Map<String, Object> metadata) {
    AppProperties.GeniusPay gp = requireKeys();
    String walletId = resolvePayoutWalletId(gp);
    if (walletId == null || walletId.isBlank()) {
      throw ApiException.of(503, "GeniusPay payout wallet is not configured");
    }
    String destProvider = "orange_money".equals(provider) ? "orange_money" : "wave";
    Map<String, Object> recipient = new LinkedHashMap<>();
    recipient.put("name", recipientName == null || recipientName.isBlank() ? "Hote Maresi" : recipientName);
    recipient.put("phone", phone);
    Map<String, Object> destination = new LinkedHashMap<>();
    destination.put("type", "mobile_money");
    destination.put("provider", destProvider);
    destination.put("account", phone);
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("wallet_id", walletId);
    body.put("recipient", recipient);
    body.put("destination", destination);
    body.put("amount", amount);
    body.put("currency", "XOF");
    body.put("description", description);
    if (idempotencyKey != null && !idempotencyKey.isBlank()) {
      body.put("idempotency_key", idempotencyKey);
    }
    if (metadata != null && !metadata.isEmpty()) body.put("metadata", metadata);

    try {
      String json = objectMapper.writeValueAsString(body);
      HttpRequest request =
          HttpRequest.newBuilder()
              .uri(URI.create(trimSlash(gp.getBaseUrl()) + "/payouts"))
              .timeout(Duration.ofSeconds(30))
              .header("Content-Type", "application/json")
              .header("Authorization", "Bearer " + gp.getApiKey())
              .header("X-API-Key", gp.getApiKey())
              .header("X-API-Secret", gp.getApiSecret())
              .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
              .build();
      HttpResponse<String> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      if (response.statusCode() >= 400) {
        throw ApiException.of(502, "Genius Pay payout error: " + truncate(response.body()));
      }
      JsonNode root = objectMapper.readTree(response.body());
      JsonNode data = root.has("data") ? root.get("data") : root;
      JsonNode payout = data.has("payout") ? data.get("payout") : data;
      Map<String, Object> result = new LinkedHashMap<>();
      result.put("reference", text(payout, "reference", "id"));
      result.put("status", text(payout, "status"));
      result.put("raw", objectMapper.convertValue(data, Map.class));
      if (result.get("reference") == null || String.valueOf(result.get("reference")).isBlank()) {
        throw ApiException.of(502, "Genius Pay did not return a payout reference");
      }
      return result;
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      throw ApiException.of(502, "Genius Pay payout failed: " + e.getMessage());
    }
  }

  private String resolvePayoutWalletId(AppProperties.GeniusPay gp) {
    if (gp.getPayoutWalletId() != null && !gp.getPayoutWalletId().isBlank()) {
      return gp.getPayoutWalletId().trim();
    }
    try {
      HttpRequest request =
          HttpRequest.newBuilder()
              .uri(URI.create(trimSlash(gp.getBaseUrl()) + "/wallets"))
              .timeout(Duration.ofSeconds(20))
              .header("Authorization", "Bearer " + gp.getApiKey())
              .header("X-API-Key", gp.getApiKey())
              .header("X-API-Secret", gp.getApiSecret())
              .GET()
              .build();
      HttpResponse<String> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      if (response.statusCode() >= 400) return null;
      JsonNode root = objectMapper.readTree(response.body());
      JsonNode data = root.has("data") ? root.get("data") : root;
      JsonNode wallets = data.has("wallets") ? data.get("wallets") : data;
      if (wallets != null && wallets.isArray() && wallets.size() > 0) {
        for (JsonNode w : wallets) {
          if ("payout".equalsIgnoreCase(text(w, "type")) && w.has("id")) {
            return w.get("id").asText();
          }
        }
        if (wallets.get(0).has("id")) return wallets.get(0).get("id").asText();
      }
    } catch (Exception ignored) {
    }
    return null;
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
