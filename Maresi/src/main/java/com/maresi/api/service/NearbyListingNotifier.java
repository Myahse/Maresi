package com.maresi.api.service;

import com.maresi.api.config.AppProperties;
import com.maresi.api.realtime.RealtimeEventPublisher;
import com.maresi.api.repository.NotificationRepository;
import com.maresi.api.repository.UserRepository;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class NearbyListingNotifier {
  private static final Logger log = LoggerFactory.getLogger(NearbyListingNotifier.class);
  static final double RADIUS_KM = 25;
  static final int MAX_CLIENTS = 80;
  private static final Set<String> GENERIC_AREAS =
      Set.of("abidjan", "cote d'ivoire", "côte d'ivoire", "ivory coast", "ivoire", "ci", "cote");

  private final UserRepository users;
  private final NotificationRepository notifications;
  private final EmailService email;
  private final RealtimeEventPublisher realtime;
  private final AppProperties props;

  public NearbyListingNotifier(
      UserRepository users,
      NotificationRepository notifications,
      EmailService email,
      RealtimeEventPublisher realtime,
      AppProperties props) {
    this.users = users;
    this.notifications = notifications;
    this.email = email;
    this.realtime = realtime;
    this.props = props;
  }

  @Async
  public void notifyNearbyClients(Map<String, Object> listing) {
    if (listing == null) return;
    UUID propertyId = uuid(listing.get("id"));
    UUID ownerId = uuid(listing.get("owner_id"));
    if (propertyId == null || ownerId == null) return;
    String title = text(listing.get("title"), "Nouvelle résidence");
    String location = text(listing.get("location"), "");
    Double latitude = asDouble(listing.get("latitude"));
    Double longitude = asDouble(listing.get("longitude"));
    String area = areaToken(location);
    List<UUID> clients =
        users.findNearbyClients(ownerId, propertyId, latitude, longitude, RADIUS_KM, area, MAX_CLIENTS);
    if (clients.isEmpty()) return;
    String cta = EmailTemplates.guestApp(props) + "/properties/" + propertyId;
    String message = title + (location.isBlank() ? "" : " — " + location);
    for (UUID clientId : clients) {
      try {
        notifications.create(
            clientId, "listing", "Nouvelle résidence près de vous", message, propertyId);
        Map<String, Object> profile = users.findById(clientId).orElse(Map.of());
        email.sendToUser(
            clientId,
            EmailTemplates.nearbyListing(EmailTemplates.personName(profile), title, location, cta));
        realtime.publish("listing.published", listingPreview(listing), clientId, null, false);
      } catch (Exception e) {
        log.warn("Nearby listing alert failed for {}: {}", clientId, e.getMessage());
      }
    }
  }

  static String areaToken(String location) {
    if (location == null || location.isBlank()) return null;
    for (String part : location.split("[,/|-]")) {
      String token = part.trim();
      if (token.length() < 3) continue;
      if (GENERIC_AREAS.contains(token.toLowerCase(Locale.ROOT))) continue;
      return token;
    }
    return null;
  }

  private static Map<String, Object> listingPreview(Map<String, Object> listing) {
    return Map.of(
        "id", String.valueOf(listing.get("id")),
        "title", text(listing.get("title"), ""),
        "location", text(listing.get("location"), ""));
  }

  private static UUID uuid(Object raw) {
    if (raw == null) return null;
    if (raw instanceof UUID id) return id;
    try {
      return UUID.fromString(raw.toString());
    } catch (IllegalArgumentException e) {
      return null;
    }
  }

  private static Double asDouble(Object raw) {
    if (raw instanceof Number n) return n.doubleValue();
    if (raw == null) return null;
    try {
      return Double.parseDouble(raw.toString());
    } catch (NumberFormatException e) {
      return null;
    }
  }

  private static String text(Object raw, String fallback) {
    if (raw == null) return fallback;
    String value = raw.toString().trim();
    return value.isBlank() || "null".equalsIgnoreCase(value) ? fallback : value;
  }
}
