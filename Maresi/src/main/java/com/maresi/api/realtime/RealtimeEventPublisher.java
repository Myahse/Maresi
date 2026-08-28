package com.maresi.api.realtime;

import java.security.Principal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class RealtimeEventPublisher {
  private final SimpMessagingTemplate messaging;

  public RealtimeEventPublisher(SimpMessagingTemplate messaging) {
    this.messaging = messaging;
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
      messaging.convertAndSend("/topic/admin", event);
    }
  }

  public static Principal principalFor(UUID userId) {
    return userId::toString;
  }
}
