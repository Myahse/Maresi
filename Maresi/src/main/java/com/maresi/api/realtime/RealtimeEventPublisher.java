package com.maresi.api.realtime;

import com.maresi.api.repository.ActivityRepository;
import java.security.Principal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class RealtimeEventPublisher {
  private final SimpMessagingTemplate messaging;
  private final ActivityRepository activity;

  public RealtimeEventPublisher(SimpMessagingTemplate messaging, ActivityRepository activity) {
    this.messaging = messaging;
    this.activity = activity;
  }

  public void publish(String type, Map<String, Object> data, UUID userId, UUID hostId, boolean toAdmin) {
    Map<String, Object> event = new LinkedHashMap<>();
    event.put("type", type);
    event.put("data", data != null ? data : Map.of());
    event.put("at", java.time.Instant.now().toString());

    if (userId != null) {
      messaging.convertAndSendToUser(userId.toString(), "/queue/events", event);
    }
    if (hostId != null) {
      messaging.convertAndSend("/topic/host." + hostId, event);
    }
    if (toAdmin) {
      record(type, data, userId, hostId);
      messaging.convertAndSend("/topic/admin", event);
    }
  }

  private void record(String type, Map<String, Object> data, UUID userId, UUID hostId) {
    try {
      Map<String, Object> payload = data == null ? Map.of() : data;
      UUID entityId = uuidOf(payload.get("id"), payload.get("visit_request_id"), payload.get("property_id"));
      String entityType = type.contains("payment") ? "payment" : type.contains("visit") ? "visit" : "event";
      String summary = type + (payload.get("status") != null ? " · " + payload.get("status") : "");
      activity.record(type, entityType, entityId, userId != null ? userId : hostId, summary, slim(payload));
    } catch (Exception ignored) {
    }
  }

  private static Map<String, Object> slim(Map<String, Object> payload) {
    Map<String, Object> out = new LinkedHashMap<>();
    for (String key :
        List.of("id", "status", "property_id", "user_id", "property_title", "amount", "type", "property_owner_id")) {
      if (payload.get(key) != null) out.put(key, String.valueOf(payload.get(key)));
    }
    return out;
  }

  private static UUID uuidOf(Object... values) {
    for (Object value : values) {
      if (value == null) continue;
      try {
        return UUID.fromString(value.toString());
      } catch (Exception ignored) {
      }
    }
    return null;
  }

  public static Principal principalFor(UUID userId) {
    return userId::toString;
  }
}
