package com.maresi.api.job;

import com.maresi.api.repository.NotificationRepository;
import com.maresi.api.repository.VisitRequestRepository;
import com.maresi.api.service.EmailService;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class StayReminderJob {
  private static final Logger log = LoggerFactory.getLogger(StayReminderJob.class);
  private static final ZoneId ABIDJAN = ZoneId.of("Africa/Abidjan");

  private final VisitRequestRepository visitRequests;
  private final NotificationRepository notifications;
  private final EmailService email;

  public StayReminderJob(
      VisitRequestRepository visitRequests,
      NotificationRepository notifications,
      EmailService email) {
    this.visitRequests = visitRequests;
    this.notifications = notifications;
    this.email = email;
  }

  @Scheduled(fixedDelay = 300_000)
  public void notifyDueStays() {
    List<Map<String, Object>> due = visitRequests.findDueStayReminders();
    if (due.isEmpty()) return;
    LocalDate today = LocalDate.now(ABIDJAN);
    for (Map<String, Object> visit : due) {
      try {
        sendOne(visit, today);
      } catch (Exception e) {
        log.warn("Stay reminder failed for {}: {}", visit.get("id"), e.getMessage());
      }
    }
  }

  private void sendOne(Map<String, Object> visit, LocalDate today) {
    UUID visitId = UUID.fromString(visit.get("id").toString());
    UUID guestId = UUID.fromString(visit.get("user_id").toString());
    UUID ownerId =
        visit.get("property_owner_id") != null
            ? UUID.fromString(visit.get("property_owner_id").toString())
            : null;
    UUID listingId =
        visit.get("property_id") != null ? UUID.fromString(visit.get("property_id").toString()) : null;
    String title =
        visit.get("property_title") == null ? "la residence" : visit.get("property_title").toString();
    LocalDate checkIn = parseDate(visit.get("check_in"));
    LocalDate checkOut = parseDate(visit.get("check_out"));

    boolean checkinDue = checkIn != null && !checkIn.isAfter(today) && visit.get("checkin_notified_at") == null;
    boolean checkoutDue = checkOut != null && !checkOut.isAfter(today) && visit.get("checkout_notified_at") == null;

    if (checkinDue) {
      String guestBody = "C'est l'heure. Votre arrivee pour " + title + " commence maintenant.";
      String hostBody = "C'est l'heure. Le client arrive pour " + title + ".";
      notifications.create(guestId, "reservation", "Heure d'arrivee", guestBody, listingId);
      email.sendToUser(guestId, "Maresi — c'est l'heure d'arriver", guestBody);
      if (ownerId != null) {
        notifications.create(ownerId, "reservation", "Heure d'arrivee", hostBody, listingId);
        email.sendToUser(ownerId, "Maresi — arrivee du client", hostBody);
      }
      visitRequests.markStayNotified(visitId, "checkin");
    }
    if (checkoutDue) {
      String guestBody = "C'est l'heure. Votre depart de " + title + " est maintenant.";
      String hostBody = "C'est l'heure. Le client doit quitter " + title + ".";
      notifications.create(guestId, "reservation", "Heure de depart", guestBody, listingId);
      email.sendToUser(guestId, "Maresi — c'est l'heure de partir", guestBody);
      if (ownerId != null) {
        notifications.create(ownerId, "reservation", "Heure de depart", hostBody, listingId);
        email.sendToUser(ownerId, "Maresi — depart du client", hostBody);
      }
      visitRequests.markStayNotified(visitId, "checkout");
    }
  }

  private static LocalDate parseDate(Object raw) {
    if (raw == null) return null;
    try {
      return LocalDate.parse(raw.toString().substring(0, 10));
    } catch (Exception e) {
      return null;
    }
  }
}
