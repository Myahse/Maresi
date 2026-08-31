package com.maresi.api.push;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.maresi.api.config.AppProperties;
import com.maresi.api.repository.PushSubscriptionRepository;
import java.nio.charset.StandardCharsets;
import java.security.Security;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.apache.http.HttpResponse;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
public class PushDeliveryService {
  private static final Logger log = LoggerFactory.getLogger(PushDeliveryService.class);

  private final AppProperties props;
  private final PushSubscriptionRepository subscriptions;
  private final ObjectMapper objectMapper;

  public PushDeliveryService(
      AppProperties props, PushSubscriptionRepository subscriptions, ObjectMapper objectMapper) {
    this.props = props;
    this.subscriptions = subscriptions;
    this.objectMapper = objectMapper;
    if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
      Security.addProvider(new BouncyCastleProvider());
    }
  }

  @Async
  @EventListener
  public void onNotificationCreated(NotificationCreatedEvent event) {
    if (!props.getPush().isConfigured()) return;
    List<Map<String, Object>> targets = subscriptions.findByUser(event.getUserId());
    if (targets.isEmpty()) return;
    PushService client;
    try {
      client =
          new PushService(
              props.getPush().getVapidPublicKey().trim(),
              props.getPush().getVapidPrivateKey().trim(),
              props.getPush().getSubject());
    } catch (Exception e) {
      log.warn("Web Push client init failed: {}", e.getMessage());
      return;
    }
    for (Map<String, Object> sub : targets) {
      sendOne(client, sub, event);
    }
  }

  private void sendOne(PushService client, Map<String, Object> sub, NotificationCreatedEvent event) {
    String endpoint = String.valueOf(sub.get("endpoint"));
    String app = String.valueOf(sub.get("app"));
    try {
      Map<String, Object> payload = new LinkedHashMap<>();
      payload.put("title", event.getTitle());
      payload.put("body", event.getMessage());
      payload.put("type", event.getType());
      payload.put("url", urlFor(app, event.getType(), event.getPropertyId()));
      byte[] bytes = objectMapper.writeValueAsString(payload).getBytes(StandardCharsets.UTF_8);
      Notification notification =
          new Notification(
              endpoint, String.valueOf(sub.get("p256dh")), String.valueOf(sub.get("auth")), bytes);
      HttpResponse response = client.send(notification);
      int status = response.getStatusLine().getStatusCode();
      if (status == 404 || status == 410) {
        subscriptions.deleteByEndpoint(endpoint);
      } else if (status >= 400) {
        log.warn("Web Push failed {} for {}", status, endpoint);
      }
    } catch (Exception e) {
      log.warn("Web Push send failed: {}", e.getMessage());
    }
  }

  static String urlFor(String app, String type, UUID propertyId) {
    if ("host".equals(app)) {
      if ("payment".equals(type)) return "/owner/subscription";
      if ("reservation".equals(type)) return "/owner/visits";
      if ("review".equals(type) && propertyId != null) return "/owner/edit/" + propertyId;
      if ("account".equals(type)) return "/owner/account";
      return "/owner";
    }
    if ("admin".equals(app)) {
      if ("host_application".equals(type)) return "/applications";
      if ("payment".equals(type)) return "/payments";
      return "/";
    }
    if ("reservation".equals(type)) return "/visits";
    if ("host_application".equals(type)) return "/become-host";
    if ("review".equals(type) && propertyId != null) return "/properties/" + propertyId;
    if ("account".equals(type)) return "/account";
    if (propertyId != null) return "/properties/" + propertyId;
    return "/";
  }
}
