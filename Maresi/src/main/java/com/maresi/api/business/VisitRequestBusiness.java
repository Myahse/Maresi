package com.maresi.api.business;

import com.maresi.api.contracts.FunctionalError;
import com.maresi.api.contracts.Request;
import com.maresi.api.contracts.Response;
import com.maresi.api.exception.ApiException;
import com.maresi.api.realtime.RealtimeEventPublisher;
import com.maresi.api.repository.NotificationRepository;
import com.maresi.api.repository.PaymentRepository;
import com.maresi.api.repository.PropertyRepository;
import com.maresi.api.repository.GuestReviewRepository;
import com.maresi.api.repository.UserRepository;
import com.maresi.api.repository.VisitMessageRepository;
import com.maresi.api.repository.VisitRequestRepository;
import com.maresi.api.security.AuthUser;
import com.maresi.api.security.SecurityUtils;
import com.maresi.api.config.AppProperties;
import com.maresi.api.service.EmailService;
import com.maresi.api.service.EmailTemplates;
import com.maresi.api.service.FileStorageService;
import com.maresi.api.service.StayContractPdf;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class VisitRequestBusiness {
  private static final Logger log = LoggerFactory.getLogger(VisitRequestBusiness.class);
  private final VisitRequestRepository visitRequests;
  private final VisitMessageRepository visitMessages;
  private final GuestReviewRepository guestReviews;
  private final PropertyRepository properties;
  private final NotificationRepository notifications;
  private final PaymentRepository payments;
  private final PaymentBusiness paymentBusiness;
  private final RealtimeEventPublisher realtime;
  private final FunctionalError functionalError;
  private final EmailService email;
  private final FileStorageService fileStorage;
  private final AppProperties appProperties;
  private final UserRepository users;
  private final UserBusiness userBusiness;

  public VisitRequestBusiness(
      VisitRequestRepository visitRequests,
      VisitMessageRepository visitMessages,
      GuestReviewRepository guestReviews,
      PropertyRepository properties,
      NotificationRepository notifications,
      PaymentRepository payments,
      PaymentBusiness paymentBusiness,
      RealtimeEventPublisher realtime,
      FunctionalError functionalError,
      EmailService email,
      FileStorageService fileStorage,
      AppProperties appProperties,
      UserRepository users,
      UserBusiness userBusiness) {
    this.visitRequests = visitRequests;
    this.visitMessages = visitMessages;
    this.guestReviews = guestReviews;
    this.properties = properties;
    this.notifications = notifications;
    this.payments = payments;
    this.paymentBusiness = paymentBusiness;
    this.realtime = realtime;
    this.functionalError = functionalError;
    this.email = email;
    this.fileStorage = fileStorage;
    this.appProperties = appProperties;
    this.users = users;
    this.userBusiness = userBusiness;
  }

  public Response<Map<String, Object>> create(Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    if (userBusiness.rejectIfSuspended(response, user.id(), locale)) {
      return response;
    }
    Map<String, Object> body = request.getData();
    UUID listingId = uuid(body.get("propertyId"));
    if (listingId == null) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("propertyId", locale));
      return response;
    }
    if (body.get("check_in") == null || body.get("check_out") == null) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("check_in, check_out", locale));
      return response;
    }
    Object visitDate = body.get("visit_date");
    String visitTime = str(body.get("visit_time"));
    if (visitDate != null && (visitTime == null || visitTime.isBlank())) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("visit_time", locale));
      return response;
    }
    if (body.get("contact_phone") == null) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("contact_phone", locale));
      return response;
    }
    String idCard = str(body.get("id_card"));
    if (idCard == null || idCard.isBlank()) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("id_card", locale));
      return response;
    }
    String arrivalTime = clock(body.get("arrival_time"));
    String departureTime = clock(body.get("departure_time"));
    if (arrivalTime == null || departureTime == null) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("arrival_time, departure_time", locale));
      return response;
    }
    if (String.valueOf(body.get("check_in")).equals(String.valueOf(body.get("check_out")))
        && arrivalTime.compareTo(departureTime) >= 0) {
      response.setHasError(true);
      response.setStatus(
          functionalError.invalidData("Le meme jour, l'arrivee doit etre avant le depart", locale));
      return response;
    }

    Map<String, Object> property = properties.findById(listingId).orElse(null);
    if (property == null) {
      response.setHasError(true);
      response.setStatus(functionalError.dataNotFound("Bien introuvable", locale));
      return response;
    }

    String agreementFullName = str(body.get("agreement_full_name"));
    boolean hasAgreement =
        agreementFullName != null
            && agreementFullName.trim().length() >= 3
            && Boolean.TRUE.equals(body.get("agreement_accepted"));

    Map<String, Object> created =
        hasAgreement
            ? visitRequests.createWithAgreement(
                user.id(),
                listingId,
                str(body.get("message")),
                body.get("check_in"),
                body.get("check_out"),
                visitDate,
                visitTime,
                intOrNull(body.get("guests_count")),
                str(body.get("contact_phone")),
                idCard,
                arrivalTime,
                departureTime,
                agreementFullName.trim())
            : visitRequests.create(
                user.id(),
                listingId,
                str(body.get("message")),
                body.get("check_in"),
                body.get("check_out"),
                visitDate,
                visitTime,
                intOrNull(body.get("guests_count")),
                str(body.get("contact_phone")),
                idCard,
                arrivalTime,
                departureTime);

    notifyVisitRequestSubmitted(user.id(), listingId, String.valueOf(property.get("title")));
    UUID ownerId =
        property.get("owner_id") != null ? UUID.fromString(property.get("owner_id").toString()) : null;
    if (ownerId != null) {
      String requester = userName(user.id());
      notifications.create(
          ownerId,
          "reservation",
          "Nouvelle reservation",
          (requester.isBlank() ? "Un client" : requester) + " a demande " + property.get("title") + ".",
          listingId);
    }
    realtime.publish("visit.created", created, user.id(), ownerId, true);
    if (ownerId != null) {
      email.sendToUser(
          ownerId,
          EmailTemplates.reservationNew(
              String.valueOf(property.get("title")),
              userName(user.id()),
              stayWhen(body.get("check_in"), arrivalTime),
              stayWhen(body.get("check_out"), departureTime),
              String.valueOf(body.get("contact_phone")),
              idCard,
              hostVisitsUrl()));
    }
    String guestStatusKey = hasAgreement ? "reservation.sent.signed" : "reservation.sent";
    email.sendToUser(user.id(), EmailTemplates.reservationSent(String.valueOf(property.get("title"))));

    response.setItem(created);
    response.setStatus(functionalError.success("Demande de reservation", locale));
    return response;
  }

  public Response<Map<String, Object>> listMine(Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    var items = visitRequests.findByUser(SecurityUtils.requireUser().id());
    items.forEach(
        item -> {
          normalizeVisit(item);
          hideHostOnlyGuestFile(item);
        });
    response.setItems(items);
    response.setCount((long) items.size());
    response.setStatus(functionalError.success("Demandes", locale));
    return response;
  }

  public Response<Map<String, Object>> getOne(UUID id, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    Map<String, Object> item = visitRequests.findById(id).orElse(null);
    if (item == null) {
      response.setHasError(true);
      response.setStatus(functionalError.dataNotFound("Demande introuvable", locale));
      return response;
    }
    boolean guest = user.id().toString().equalsIgnoreCase(String.valueOf(item.get("user_id")));
    boolean owner =
        item.get("property_owner_id") != null
            && user.id().toString().equalsIgnoreCase(String.valueOf(item.get("property_owner_id")));
    boolean admin = "admin".equals(user.role());
    if (!guest && !owner && !admin) {
      response.setHasError(true);
      response.setStatus(functionalError.disallowed("Action non autorisee", locale));
      return response;
    }
    if (owner || admin) {
      exposeIdentityLinks(item);
    }
    if (owner && !guest && !admin) {
      hideKeyCode(item);
    }
    normalizeVisit(item);
    if (owner || admin) {
      attachHostOnlyGuestFile(item);
    } else {
      hideHostOnlyGuestFile(item);
    }
    response.setItem(item);
    response.setStatus(functionalError.success("Demande", locale));
    return response;
  }

  public Response<Map<String, Object>> listMessages(UUID id, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    Map<String, Object> visit = loadVisitForParty(id, locale, response);
    if (visit == null) return response;
    AuthUser reader = SecurityUtils.requireUser();
    if (visitMessages.markIncoming(id, reader.id(), true) > 0) {
      notifyMessageReceipt(visit, true);
    }
    List<Map<String, Object>> items = visitMessages.findByVisit(id);
    for (Map<String, Object> item : items) {
      exposeMessageAttachment(id, item);
    }
    response.setItems(items);
    response.setCount((long) items.size());
    response.setStatus(functionalError.success("Messages", locale));
    return response;
  }

  public Response<Map<String, Object>> ackMessages(
      UUID id, Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    Map<String, Object> visit = loadVisitForParty(id, locale, response);
    if (visit == null) return response;
    AuthUser reader = SecurityUtils.requireUser();
    Map<String, Object> body = request.getData() == null ? Map.of() : request.getData();
    boolean seen =
        Boolean.TRUE.equals(body.get("seen")) || "seen".equalsIgnoreCase(str(body.get("state")));
    int updated = visitMessages.markIncoming(id, reader.id(), seen);
    if (updated > 0) notifyMessageReceipt(visit, seen);
    response.setItem(Map.of("updated", updated, "seen", seen));
    response.setStatus(functionalError.success("Messages", locale));
    return response;
  }

  public Response<Map<String, Object>> postMessage(UUID id, Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    if (userBusiness.rejectIfSuspended(response, user.id(), locale)) {
      return response;
    }
    Map<String, Object> visit = loadVisitForParty(id, locale, response);
    if (visit == null) return response;
    if (rejectIfChatLocked(visit, response, locale)) return response;
    Map<String, Object> body = request.getData() == null ? Map.of() : request.getData();
    String text = str(body.get("body"));
    if (text == null) text = str(body.get("message"));
    if (text == null || text.isBlank()) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("body", locale));
      return response;
    }
    return saveMessage(id, visit, user, text.trim(), null, null, null, response, locale);
  }

  public Response<Map<String, Object>> postMessageWithFile(
      UUID id, String text, MultipartFile file, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    if (userBusiness.rejectIfSuspended(response, user.id(), locale)) {
      return response;
    }
    Map<String, Object> visit = loadVisitForParty(id, locale, response);
    if (visit == null) return response;
    if (rejectIfChatLocked(visit, response, locale)) return response;
    String trimmed = text == null ? "" : text.trim();
    if (file == null || file.isEmpty()) {
      if (trimmed.isBlank()) {
        response.setHasError(true);
        response.setStatus(functionalError.fieldEmpty("body", locale));
        return response;
      }
      return saveMessage(id, visit, user, trimmed, null, null, null, response, locale);
    }
    String stored = fileStorage.storeChatFile(file, EmailTemplates.guestApp(appProperties));
    String fileName = originalFileName(file);
    String fileType = file.getContentType();
    return saveMessage(id, visit, user, trimmed, stored, fileName, fileType, response, locale);
  }

  public Response<Map<String, Object>> closeChat(UUID id, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    Map<String, Object> visit = loadVisitForParty(id, locale, response);
    if (visit == null) return response;
    if (isChatLocked(visit)) {
      normalizeVisit(visit);
      response.setItem(visit);
      response.setStatus(functionalError.success("Discussion fermee", locale));
      return response;
    }
    if (!canCloseChat(visit)) {
      response.setHasError(true);
      response.setStatus(
          functionalError.invalidData("Fermez la discussion une fois le sejour termine", locale));
      return response;
    }
    Map<String, Object> updated = visitRequests.closeChat(id).orElse(visit);
    normalizeVisit(updated);
    UUID guestId = uuid(updated.get("user_id"));
    UUID ownerId = updated.get("property_owner_id") == null ? null : uuid(updated.get("property_owner_id"));
    realtime.publish("visit.status_changed", updated, guestId, ownerId, true);
    response.setItem(updated);
    response.setStatus(functionalError.success("Discussion fermee", locale));
    return response;
  }

  public FileStorageService.StoredMedia loadMessageAttachment(UUID visitId, UUID messageId) {
    Response<Map<String, Object>> response = new Response<>();
    Map<String, Object> visit = loadVisitForParty(visitId, Locale.FRENCH, response);
    if (visit == null) return null;
    Map<String, Object> message = visitMessages.findById(visitId, messageId).orElse(null);
    if (message == null) return null;
    return fileStorage.loadChatFile(str(message.get("attachment_url")));
  }

  private Map<String, Object> loadVisitForParty(UUID id, Locale locale, Response<?> response) {
    AuthUser user = SecurityUtils.requireUser();
    Map<String, Object> item = visitRequests.findById(id).orElse(null);
    if (item == null) {
      response.setHasError(true);
      response.setStatus(functionalError.dataNotFound("Demande introuvable", locale));
      return null;
    }
    boolean guest = user.id().toString().equalsIgnoreCase(String.valueOf(item.get("user_id")));
    boolean owner =
        item.get("property_owner_id") != null
            && user.id().toString().equalsIgnoreCase(String.valueOf(item.get("property_owner_id")));
    boolean admin = "admin".equals(user.role());
    if (!guest && !owner && !admin) {
      response.setHasError(true);
      response.setStatus(functionalError.disallowed("Action non autorisee", locale));
      return null;
    }
    return item;
  }

  private void notifyVisitMessage(Map<String, Object> visit, AuthUser sender, Map<String, Object> message) {
    UUID guestId = uuid(visit.get("user_id"));
    UUID ownerId = visit.get("property_owner_id") == null ? null : uuid(visit.get("property_owner_id"));
    UUID listingId = visit.get("property_id") == null ? null : uuid(visit.get("property_id"));
    UUID recipient = sender.id().equals(guestId) ? ownerId : guestId;
    String fromName = EmailTemplates.personName(users.findById(sender.id()).orElse(null));
    if (fromName == null || fromName.isBlank()) fromName = sender.email();
    String preview = str(message.get("body"));
    if (preview == null || preview.isBlank()) {
      preview = str(message.get("attachment_name"));
      if (preview == null || preview.isBlank()) preview = "Document";
    }
    if (preview.length() > 160) preview = preview.substring(0, 157) + "...";
    if (recipient != null) {
      notifications.create(
          recipient,
          "reservation",
          "Nouveau message",
          fromName + " : " + preview,
          listingId);
    }
    realtime.publish("visit.message", message, guestId, ownerId, false);
  }

  private void notifyMessageReceipt(Map<String, Object> visit, boolean seen) {
    UUID guestId = uuid(visit.get("user_id"));
    UUID ownerId = visit.get("property_owner_id") == null ? null : uuid(visit.get("property_owner_id"));
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("visit_request_id", visit.get("id"));
    payload.put("seen", seen);
    payload.put("delivered", true);
    realtime.publish("visit.message.receipt", payload, guestId, ownerId, false);
  }

  public Response<Map<String, Object>> listForOwner(Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    var items = visitRequests.findByPropertyOwner(SecurityUtils.requireUser().id());
    for (Map<String, Object> item : items) {
      exposeIdentityLinks(item);
      hideKeyCode(item);
      normalizeVisit(item);
      attachHostOnlyGuestFile(item);
    }
    response.setItems(items);
    response.setCount((long) items.size());
    response.setStatus(functionalError.success("Demandes proprietaire", locale));
    return response;
  }

  public Response<Map<String, Object>> updateStatus(
      UUID id, Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    String status = str(request.getData().get("status"));
    Map<String, Object> current = visitRequests.findById(id).orElse(null);
    if (current == null) {
      response.setHasError(true);
      response.setStatus(functionalError.dataNotFound("Demande introuvable", locale));
      return response;
    }

    if ("cancelled".equals(status)) {
      return guestCancel(id, current, user, locale);
    }
    if ("payment_sent".equals(status)) {
      return guestMarkPaid(id, current, user, locale);
    }
    if ("confirmed".equals(status)) {
      return hostConfirmReceipt(id, current, user, request, locale);
    }
    if (status == null || !List.of("pending", "accepted", "declined").contains(status)) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Statut invalide", locale));
      return response;
    }
    if ("accepted".equals(status)
        && payments.sumPendingAccruedCommission(user.id()).compareTo(BigDecimal.valueOf(200)) >= 0) {
      response.setHasError(true);
      response.setStatus(
          functionalError.disallowed("Reglez la commission Maresi avant d'accepter une reservation", locale));
      return response;
    }

    String hostFullName = str(request.getData().get("host_agreement_full_name"));
    boolean hostHasAgreement =
        hostFullName != null
            && hostFullName.trim().length() >= 3
            && Boolean.TRUE.equals(request.getData().get("host_agreement_accepted"));

    String storedStatus;
    Map<String, Object> updated;
    if ("accepted".equals(status) && hostHasAgreement) {
      String keyCode = String.format("%06d", java.util.concurrent.ThreadLocalRandom.current().nextInt(1_000_000));
      updated =
          visitRequests.signHostAgreement(id, user.id(), hostFullName.trim(), keyCode).orElse(null);
      storedStatus = "awaiting_key";
    } else {
      storedStatus = "accepted".equals(status) ? "awaiting_host_agreement" : status;
      updated =
          visitRequests
              .updateStatus(id, storedStatus, user.id(), str(request.getData().get("ownerNote")))
              .orElse(null);
    }
    if (updated == null) {
      response.setHasError(true);
      response.setStatus(functionalError.dataNotFound("Demande introuvable", locale));
      return response;
    }
    UUID requesterId = UUID.fromString(updated.get("user_id").toString());
    UUID listingId = UUID.fromString(updated.get("property_id").toString());
    String title = String.valueOf(updated.get("property_title") == null ? "la residence" : updated.get("property_title"));
    Map<String, Object> published = new java.util.HashMap<>(updated);
    if ("awaiting_key".equals(storedStatus)) {
      hideKeyCode(published);
    }
    realtime.publish("visit.status_changed", published, requesterId, user.id(), true);
    if ("awaiting_host_agreement".equals(storedStatus)) {
      notifications.create(
          requesterId,
          "reservation",
          "En attente de l'hote",
          "Votre demande a ete recue. L'hote va examiner et valider votre reservation.",
          listingId);
      email.sendToUser(requesterId, EmailTemplates.reservationAccepted(title, hostVisitsUrl()));
    } else if ("awaiting_key".equals(storedStatus)) {
      notifications.create(
          requesterId,
          "reservation",
          "Code cle",
          "Le contrat est signe des deux cotes. Demandez le code a 6 chiffres a l'hote, puis allez au paiement.",
          listingId);
      notifications.create(
          user.id(),
          "reservation",
          "Attente du code cle",
          "Vous avez accepte et signe. Demandez le code a 6 chiffres au client, saisissez-le, puis le client paiera.",
          listingId);
      Map<String, Object> listing = properties.findById(listingId).orElse(Map.of());
      String listingTitle = str(listing.get("title"));
      if (listingTitle == null || listingTitle.isBlank()) listingTitle = "la residence";
      String location = str(listing.get("location"));
      if (location == null) location = str(updated.get("location"));
      String checkIn = str(updated.get("check_in"));
      String checkOut = str(updated.get("check_out"));
      String guestName = str(updated.get("agreement_full_name"));
      String guestSignedAt = str(updated.get("agreement_signed_at"));
      String hostName = str(updated.get("host_agreement_full_name"));
      String hostSignedAt = str(updated.get("host_agreement_signed_at"));
      EmailTemplates.Mail contractGuest =
          EmailTemplates.stayContractCopyForGuest(
              listingTitle, location, checkIn, checkOut, guestName, guestSignedAt,
              hostName, hostSignedAt, visitUrl(id), null);
      EmailTemplates.Mail contractHost =
          EmailTemplates.stayContractCopyForHost(
              listingTitle, location, checkIn, checkOut, guestName, guestSignedAt,
              hostName, hostSignedAt, hostVisitsUrl(), userName(requesterId));
      email.sendToUser(requesterId, contractGuest);
      email.sendToUser(user.id(), contractHost);
    } else {
      notifyVisitRequestStatusUpdated(requesterId, listingId, status);
      email.sendToUser(requesterId, EmailTemplates.reservationDeclined(title));
    }
    response.setItem(updated);
    response.setStatus(functionalError.success("Statut mis a jour", locale));
    return response;
  }

  private Response<Map<String, Object>> guestCancel(
      UUID id, Map<String, Object> current, AuthUser user, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    if (!user.id().toString().equalsIgnoreCase(String.valueOf(current.get("user_id")))) {
      response.setHasError(true);
      response.setStatus(functionalError.disallowed("Action non autorisee", locale));
      return response;
    }
    String currentStatus = String.valueOf(current.get("status"));
    if ("cancelled".equals(currentStatus) || "declined".equals(currentStatus)) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Cette reservation ne peut plus etre annulee", locale));
      return response;
    }
    if (List.of("payment_sent", "confirmed").contains(currentStatus)) {
      response.setHasError(true);
      response.setStatus(
          functionalError.disallowed(
              "Apres paiement, seul un administrateur peut annuler. Contactez le support Maresi.",
              locale));
      return response;
    }
    if (!List.of("pending", "awaiting_agreement", "awaiting_host_agreement", "awaiting_key", "awaiting_payment")
        .contains(currentStatus)) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Cette reservation ne peut plus etre annulee", locale));
      return response;
    }
    payments.abandonPendingReservations(id);
    Map<String, Object> updated = visitRequests.updateStatusById(id, "cancelled").orElse(current);
    UUID listingId = UUID.fromString(updated.get("property_id").toString());
    UUID ownerId =
        current.get("property_owner_id") != null
            ? UUID.fromString(current.get("property_owner_id").toString())
            : null;
    if (ownerId != null) {
      notifications.create(
          ownerId,
          "reservation",
          "Reservation annulee",
          "Le client a annule cette reservation.",
          listingId);
    }
    realtime.publish("visit.status_changed", updated, user.id(), ownerId, true);
    response.setItem(updated);
    response.setStatus(functionalError.success("Reservation annulee", locale));
    return response;
  }

  private Response<Map<String, Object>> guestMarkPaid(
      UUID id, Map<String, Object> current, AuthUser user, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    if (!user.id().toString().equalsIgnoreCase(String.valueOf(current.get("user_id")))) {
      response.setHasError(true);
      response.setStatus(functionalError.disallowed("Action non autorisee", locale));
      return response;
    }
    if (!"awaiting_payment".equals(String.valueOf(current.get("status")))) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Cette reservation n'attend pas de paiement", locale));
      return response;
    }
    Map<String, Object> updated = visitRequests.updateStatusById(id, "payment_sent").orElse(current);
    UUID listingId = UUID.fromString(updated.get("property_id").toString());
    UUID ownerId =
        current.get("property_owner_id") != null
            ? UUID.fromString(current.get("property_owner_id").toString())
            : null;
    if (ownerId != null) {
      notifications.create(
          ownerId,
          "reservation",
          "Paiement declare",
          "Le client indique avoir paye. Confirmez la reception.",
          listingId);
    }
    realtime.publish("visit.status_changed", updated, user.id(), ownerId, true);
    response.setItem(updated);
    response.setStatus(functionalError.success("Paiement declare", locale));
    return response;
  }

  private Response<Map<String, Object>> hostConfirmReceipt(
      UUID id, Map<String, Object> current, AuthUser user, Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    if (!"payment_sent".equals(String.valueOf(current.get("status")))) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Le client n'a pas encore declare le paiement", locale));
      return response;
    }
    Map<String, Object> updated =
        visitRequests
            .updateStatus(id, "confirmed", user.id(), str(request.getData().get("ownerNote")))
            .orElse(null);
    if (updated == null) {
      response.setHasError(true);
      response.setStatus(functionalError.disallowed("Confirmation non autorisee", locale));
      return response;
    }
    paymentBusiness.accrueHostCommission(current);
    UUID requesterId = UUID.fromString(updated.get("user_id").toString());
    UUID listingId = UUID.fromString(updated.get("property_id").toString());
    notifications.create(
        requesterId,
        "reservation",
        "Reservation confirmee",
        "L'hote a confirme votre paiement. La reservation est validee.",
        listingId);
    realtime.publish("visit.status_changed", updated, requesterId, user.id(), true);
    response.setItem(updated);
    response.setStatus(functionalError.success("Reservation confirmee", locale));
    return response;
  }

  private void notifyVisitRequestSubmitted(UUID userId, UUID listingId, String propertyTitle) {
    notifications.create(
        userId,
        "reservation",
        "Demande envoyee",
        "Votre demande pour " + propertyTitle + " a ete soumise.",
        listingId);
  }

  private void notifyVisitRequestStatusUpdated(UUID userId, UUID listingId, String status) {
    notifications.create(
        userId,
        "reservation",
        "Mise a jour de reservation",
        "Votre demande de visite est " + status + ".",
        listingId);
  }

  public Response<Map<String, Object>> signAgreement(
      UUID id, Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    Map<String, Object> data = request.getData() == null ? Map.of() : request.getData();
    String fullName = str(data.get("full_name"));
    if (fullName == null || fullName.isBlank()) fullName = str(data.get("fullName"));
    if (fullName == null || fullName.trim().length() < 3) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("full_name", locale));
      return response;
    }
    boolean accepted =
        Boolean.TRUE.equals(data.get("accepted"))
            || "true".equalsIgnoreCase(String.valueOf(data.get("accepted")));
    if (!accepted) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Vous devez accepter l'engagement", locale));
      return response;
    }
    Map<String, Object> updated = visitRequests.signAgreement(id, user.id(), fullName.trim()).orElse(null);
    if (updated == null) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Signez apres acceptation de l'hote", locale));
      return response;
    }
    UUID listingId = UUID.fromString(updated.get("property_id").toString());
    UUID ownerId =
        updated.get("property_owner_id") != null
            ? UUID.fromString(updated.get("property_owner_id").toString())
            : properties
                .findById(listingId)
                .map(p -> p.get("owner_id"))
                .map(Object::toString)
                .map(UUID::fromString)
                .orElse(null);
    Map<String, Object> published = new java.util.HashMap<>(updated);
    hideKeyCode(published);
    realtime.publish("visit.status_changed", published, user.id(), ownerId, true);
    String listingTitle =
        properties
            .findById(listingId)
            .map(p -> p.get("title"))
            .map(Object::toString)
            .orElse("la residence");
    notifications.create(
        user.id(),
        "reservation",
        "Contrat signe",
        "Vous avez signe. L'hote doit signer le meme contrat. Vous recevrez ensuite une copie par e-mail.",
        listingId);
    if (ownerId != null) {
      notifications.create(
          ownerId,
          "reservation",
          "Signez le contrat",
          "Le client a signe. Signez le contrat pour continuer.",
          listingId);
      email.sendToUser(
          ownerId,
          EmailTemplates.hostPleaseSign(listingTitle, userName(user.id()), hostAgreementUrl(id)));
    }
    response.setItem(updated);
    response.setStatus(functionalError.success("Engagement signe", locale));
    return response;
  }

  public Response<Map<String, Object>> signHostAgreement(
      UUID id, Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    Map<String, Object> data = request.getData() == null ? Map.of() : request.getData();
    String fullName = str(data.get("full_name"));
    if (fullName == null || fullName.isBlank()) fullName = str(data.get("fullName"));
    if (fullName == null || fullName.trim().length() < 3) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("full_name", locale));
      return response;
    }
    boolean accepted =
        Boolean.TRUE.equals(data.get("accepted"))
            || "true".equalsIgnoreCase(String.valueOf(data.get("accepted")));
    if (!accepted) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Vous devez accepter l'engagement", locale));
      return response;
    }
    String keyCode = String.format("%06d", java.util.concurrent.ThreadLocalRandom.current().nextInt(1_000_000));
    Map<String, Object> updated =
        visitRequests.signHostAgreement(id, user.id(), fullName.trim(), keyCode).orElse(null);
    if (updated == null) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Signez apres la signature du client", locale));
      return response;
    }
    UUID listingId = UUID.fromString(updated.get("property_id").toString());
    UUID requesterId = UUID.fromString(updated.get("user_id").toString());
    Map<String, Object> published = new java.util.HashMap<>(updated);
    hideKeyCode(published);
    realtime.publish("visit.status_changed", published, requesterId, user.id(), true);
    Map<String, Object> listing = properties.findById(listingId).orElse(Map.of());
    String listingTitle = str(listing.get("title"));
    if (listingTitle == null || listingTitle.isBlank()) listingTitle = "la residence";
    String location = str(listing.get("location"));
    if (location == null) location = str(updated.get("location"));
    String checkIn = str(updated.get("check_in"));
    String checkOut = str(updated.get("check_out"));
    String guestName = str(updated.get("agreement_full_name"));
    String guestSignedAt = str(updated.get("agreement_signed_at"));
    String hostName = fullName.trim();
    String hostSignedAt = str(updated.get("host_agreement_signed_at"));
    EmailTemplates.Mail contractGuest =
        EmailTemplates.stayContractCopyForGuest(
            listingTitle,
            location,
            checkIn,
            checkOut,
            guestName,
            guestSignedAt,
            hostName,
            hostSignedAt,
            agreementUrl(id),
            keyCode);
    EmailTemplates.Mail contractHost =
        EmailTemplates.stayContractCopyForHost(
            listingTitle,
            location,
            checkIn,
            checkOut,
            guestName,
            guestSignedAt,
            hostName,
            hostSignedAt,
            hostVisitsUrl(),
            userName(requesterId));
    EmailService.Attachment pdf = stayContractAttachment(
        id, listingTitle, location, checkIn, checkOut, guestName, guestSignedAt, hostName, hostSignedAt);
    email.sendToUser(requesterId, contractGuest, pdf);
    email.sendToUser(user.id(), contractHost, pdf);
    notifications.create(
        requesterId,
        "reservation",
        "Code cle",
        "Le contrat est signe des deux cotes. Donnez le code a 6 chiffres a l'hote, puis allez au paiement.",
        listingId);
    notifications.create(
        user.id(),
        "reservation",
        "Attente du code cle",
        "Vous avez signe. Demandez le code a 6 chiffres, saisissez-le, puis le client paiera.",
        listingId);
    response.setItem(updated);
    response.setStatus(functionalError.success("Contrat hote signe", locale));
    return response;
  }

  public Response<Map<String, Object>> confirmKey(UUID id, Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    Map<String, Object> data = request.getData() == null ? Map.of() : request.getData();
    String code = str(data.get("code"));
    if (code == null || !code.trim().matches("\\d{6}")) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Saisissez le code a 6 chiffres", locale));
      return response;
    }
    Map<String, Object> updated = visitRequests.confirmKey(id, user.id(), code.trim()).orElse(null);
    if (updated == null) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Code incorrect ou deja utilise", locale));
      return response;
    }
    hideKeyCode(updated);
    UUID requesterId = UUID.fromString(updated.get("user_id").toString());
    UUID listingId = UUID.fromString(updated.get("property_id").toString());
    realtime.publish("visit.status_changed", updated, requesterId, user.id(), true);
    notifications.create(
        requesterId,
        "reservation",
        "Cle confirmee",
        "L'hote a confirme le code. Allez au paiement maintenant.",
        listingId);
    email.sendToUser(requesterId, EmailTemplates.payHost(guestVisitsUrl()));
    response.setItem(updated);
    response.setStatus(functionalError.success("Code confirme", locale));
    return response;
  }

  public Response<Map<String, Object>> requestExtension(
      UUID id, Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    Map<String, Object> current = visitRequests.findById(id).orElse(null);
    if (current == null) {
      response.setHasError(true);
      response.setStatus(functionalError.dataNotFound("Demande introuvable", locale));
      return response;
    }
    if (!user.id().toString().equalsIgnoreCase(String.valueOf(current.get("user_id")))) {
      response.setHasError(true);
      response.setStatus(functionalError.disallowed("Action non autorisee", locale));
      return response;
    }
    if (current.get("closed_at") != null) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Ce sejour est deja clos", locale));
      return response;
    }
    String stayStatus = String.valueOf(current.get("status"));
    if (!List.of("confirmed", "payment_sent").contains(stayStatus)) {
      response.setHasError(true);
      response.setStatus(
          functionalError.invalidData("Prolongez uniquement un sejour confirme", locale));
      return response;
    }
    String extStatus = str(current.get("extension_status"));
    if (extStatus != null && !List.of("declined", "confirmed").contains(extStatus)) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Une prolongation est deja en cours", locale));
      return response;
    }
    LocalDate currentOut = parseDate(current.get("check_out"));
    LocalDate newOut = parseDate(request.getData() != null ? request.getData().get("check_out") : null);
    if (currentOut == null || newOut == null) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("check_out", locale));
      return response;
    }
    if (!newOut.isAfter(currentOut)) {
      response.setHasError(true);
      response.setStatus(
          functionalError.invalidData("La nouvelle date de depart doit etre apres le depart actuel", locale));
      return response;
    }
    if (currentOut.isBefore(LocalDate.now())) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Le sejour est deja termine", locale));
      return response;
    }
    BigDecimal amount = extraNightsAmount(current, currentOut, newOut);
    Map<String, Object> updated =
        visitRequests.requestExtension(id, user.id(), java.sql.Date.valueOf(newOut), amount).orElse(null);
    if (updated == null) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Impossible d'envoyer la demande", locale));
      return response;
    }
    Map<String, Object> item = visitRequests.findById(id).orElse(updated);
    normalizeVisit(item);
    UUID ownerId = ownerId(item, current);
    UUID listingId = UUID.fromString(item.get("property_id").toString());
    String title = String.valueOf(item.get("property_title") == null ? "la residence" : item.get("property_title"));
    if (ownerId != null) {
      notifications.create(
          ownerId,
          "reservation",
          "Demande de prolongation",
          "Le client souhaite rester jusqu'au " + newOut + ". Acceptez ou refusez.",
          listingId);
      email.sendToUser(
          ownerId, EmailTemplates.extensionRequested(title, userName(user.id()), String.valueOf(newOut), String.valueOf(amount), hostVisitsUrl()));
    }
    realtime.publish("visit.status_changed", item, user.id(), ownerId, true);
    response.setItem(item);
    response.setStatus(functionalError.success("Prolongation demandee", locale));
    return response;
  }

  public Response<Map<String, Object>> decideExtension(
      UUID id, Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    Map<String, Object> data = request.getData() == null ? Map.of() : request.getData();
    String decision = str(data.get("status"));
    if (decision == null) decision = str(data.get("decision"));
    if (decision != null) decision = decision.trim().toLowerCase(Locale.ROOT);
    if (!"approved".equals(decision) && !"declined".equals(decision)) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Decidez approved ou declined", locale));
      return response;
    }
    String note = str(data.get("note"));
    if (note == null) note = str(data.get("ownerNote"));
    Map<String, Object> updated =
        "approved".equals(decision)
            ? visitRequests.approveExtension(id, user.id(), note).orElse(null)
            : visitRequests.declineExtension(id, user.id(), note).orElse(null);
    if (updated == null) {
      response.setHasError(true);
      response.setStatus(functionalError.disallowed("Aucune prolongation en attente", locale));
      return response;
    }
    Map<String, Object> item = visitRequests.findById(id).orElse(updated);
    normalizeVisit(item);
    UUID requesterId = UUID.fromString(item.get("user_id").toString());
    UUID listingId = UUID.fromString(item.get("property_id").toString());
    String title = String.valueOf(item.get("property_title") == null ? "la residence" : item.get("property_title"));
    if ("approved".equals(decision)) {
      notifications.create(
          requesterId,
          "reservation",
          "Prolongation acceptee",
          "L'hote a accepte. Payez les nuits supplementaires.",
          listingId);
      email.sendToUser(
          requesterId, EmailTemplates.extensionAccepted(title, String.valueOf(item.get("check_out"))));
    } else {
      notifications.create(
          requesterId,
          "reservation",
          "Prolongation refusee",
          "L'hote a refuse la prolongation. Le depart reste inchange.",
          listingId);
      email.sendToUser(requesterId, EmailTemplates.extensionDeclined(title));
    }
    realtime.publish("visit.status_changed", item, requesterId, user.id(), true);
    response.setItem(item);
    response.setStatus(functionalError.success("Prolongation mise a jour", locale));
    return response;
  }

  public Response<Map<String, Object>> markExtensionPaid(UUID id, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    Map<String, Object> updated = visitRequests.markExtensionPaid(id, user.id()).orElse(null);
    if (updated == null) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Aucun supplement a declarer", locale));
      return response;
    }
    Map<String, Object> item = visitRequests.findById(id).orElse(updated);
    normalizeVisit(item);
    UUID ownerId = ownerId(item, updated);
    UUID listingId = UUID.fromString(item.get("property_id").toString());
    if (ownerId != null) {
      notifications.create(
          ownerId,
          "reservation",
          "Supplement declare",
          "Le client indique avoir paye la prolongation. Confirmez la reception.",
          listingId);
    }
    realtime.publish("visit.status_changed", item, user.id(), ownerId, true);
    response.setItem(item);
    response.setStatus(functionalError.success("Supplement declare", locale));
    return response;
  }

  public Response<Map<String, Object>> confirmExtensionPayment(UUID id, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    Map<String, Object> updated = visitRequests.confirmExtensionPayment(id, user.id()).orElse(null);
    if (updated == null) {
      response.setHasError(true);
      response.setStatus(functionalError.disallowed("Aucun supplement a confirmer", locale));
      return response;
    }
    Map<String, Object> item = visitRequests.findById(id).orElse(updated);
    normalizeVisit(item);
    UUID requesterId = UUID.fromString(item.get("user_id").toString());
    UUID listingId = UUID.fromString(item.get("property_id").toString());
    notifications.create(
        requesterId,
        "reservation",
        "Prolongation confirmee",
        "L'hote a confirme le paiement des nuits supplementaires.",
        listingId);
    realtime.publish("visit.status_changed", item, requesterId, user.id(), true);
    response.setItem(item);
    response.setStatus(functionalError.success("Prolongation confirmee", locale));
    return response;
  }

  public Response<Map<String, Object>> billOverstay(
      UUID id, Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    Map<String, Object> current = visitRequests.findById(id).orElse(null);
    if (current == null) {
      response.setHasError(true);
      response.setStatus(functionalError.dataNotFound("Demande introuvable", locale));
      return response;
    }
    if (current.get("closed_at") != null) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Ce sejour est deja clos", locale));
      return response;
    }
    LocalDate currentOut = parseDate(current.get("check_out"));
    LocalDate newOut = parseDate(request.getData() != null ? request.getData().get("check_out") : null);
    if (currentOut == null || newOut == null) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("check_out", locale));
      return response;
    }
    if (!currentOut.isBefore(LocalDate.now())) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Le sejour n'est pas encore en depassement", locale));
      return response;
    }
    if (!newOut.isAfter(currentOut)) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("La nouvelle date doit depasser le depart", locale));
      return response;
    }
    BigDecimal amount = extraNightsAmount(current, currentOut, newOut);
    Map<String, Object> updated =
        visitRequests.billOverstay(id, user.id(), java.sql.Date.valueOf(newOut), amount).orElse(null);
    if (updated == null) {
      response.setHasError(true);
      response.setStatus(functionalError.disallowed("Impossible de facturer le depassement", locale));
      return response;
    }
    Map<String, Object> item = visitRequests.findById(id).orElse(updated);
    normalizeVisit(item);
    attachHostOnlyGuestFile(item);
    UUID requesterId = UUID.fromString(item.get("user_id").toString());
    UUID listingId = UUID.fromString(item.get("property_id").toString());
    notifications.create(
        requesterId,
        "reservation",
        "Depassement a payer",
        "L'hote facture les nuits de depassement. Payez-le directement, puis declarez le paiement.",
        listingId);
    email.sendToUser(
        requesterId,
        EmailTemplates.overstayDue(String.valueOf(amount), String.valueOf(newOut), guestVisitsUrl()));
    Map<String, Object> published = new java.util.HashMap<>(item);
    hideHostOnlyGuestFile(published);
    realtime.publish("visit.status_changed", published, requesterId, user.id(), true);
    response.setItem(item);
    response.setStatus(functionalError.success("Depassement facture", locale));
    return response;
  }

  public Response<Map<String, Object>> closeStay(
      UUID id, Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    Map<String, Object> current = visitRequests.findById(id).orElse(null);
    if (current == null) {
      response.setHasError(true);
      response.setStatus(functionalError.dataNotFound("Demande introuvable", locale));
      return response;
    }
    if (current.get("closed_at") != null) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Ce sejour est deja clos", locale));
      return response;
    }
    if (!List.of("confirmed", "payment_sent").contains(String.valueOf(current.get("status")))) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Cloturez uniquement un sejour confirme", locale));
      return response;
    }
    LocalDate currentOut = parseDate(current.get("check_out"));
    if (currentOut != null && currentOut.isAfter(LocalDate.now())) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Attendez la date de depart pour cloturer", locale));
      return response;
    }
    Map<String, Object> data = request.getData() == null ? Map.of() : request.getData();
    int score;
    try {
      score = data.get("score") instanceof Number n ? n.intValue() : Integer.parseInt(String.valueOf(data.get("score")));
    } catch (Exception e) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("score", locale));
      return response;
    }
    if (score < 1 || score > 5) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Note de 1 a 5", locale));
      return response;
    }
    String note = str(data.get("note"));
    if (note != null) note = note.trim();
    if (note != null && note.isEmpty()) note = null;
    UUID guestId = UUID.fromString(current.get("user_id").toString());
    UUID listingId = UUID.fromString(current.get("property_id").toString());
    if (guestReviews.existsForVisit(id)) {
      response.setHasError(true);
      response.setStatus(functionalError.dataExist("Avis client deja enregistre", locale));
      return response;
    }
    guestReviews.create(id, guestId, user.id(), listingId, score, note);
    guestReviews.refreshGuestAggregate(guestId);
    Map<String, Object> updated = visitRequests.closeStay(id, user.id()).orElse(null);
    if (updated == null) {
      response.setHasError(true);
      response.setStatus(functionalError.disallowed("Cloture non autorisee", locale));
      return response;
    }
    Map<String, Object> item = visitRequests.findById(id).orElse(updated);
    normalizeVisit(item);
    attachHostOnlyGuestFile(item);
    Map<String, Object> published = new java.util.HashMap<>(item);
    hideHostOnlyGuestFile(published);
    realtime.publish("visit.status_changed", published, guestId, user.id(), true);
    response.setItem(item);
    response.setStatus(functionalError.success("Sejour clos", locale));
    return response;
  }

  public FileStorageService.StoredMedia loadRequesterIdentity(UUID visitId, String kind) {
    AuthUser user = SecurityUtils.requireUser();
    Map<String, Object> row = visitRequests.findRequesterIdentity(visitId).orElse(null);
    if (row == null) return null;
    boolean owner = user.id().toString().equalsIgnoreCase(String.valueOf(row.get("property_owner_id")));
    boolean guest = user.id().toString().equalsIgnoreCase(String.valueOf(row.get("user_id")));
    boolean admin = "admin".equals(user.role());
    if (!owner && !guest && !admin) {
      throw ApiException.of(403, "Access denied");
    }
    String stored =
        switch (kind == null ? "" : kind) {
          case "id-card", "id-front" -> str(row.get("id_card_photo_url"));
          case "id-back" -> str(row.get("id_card_back_url"));
          default -> str(row.get("selfie_url"));
        };
    return fileStorage.loadIdentityImage(stored);
  }

  public Response<Map<String, Object>> uploadPaymentReceipt(
      UUID id, MultipartFile file, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    Map<String, Object> current = visitRequests.findById(id).orElse(null);
    if (current == null) {
      response.setHasError(true);
      response.setStatus(functionalError.dataNotFound("Demande introuvable", locale));
      return response;
    }
    if (!sameId(current.get("user_id"), user.id()) && !"admin".equals(user.role())) {
      response.setHasError(true);
      response.setStatus(functionalError.disallowed("Action non autorisee", locale));
      return response;
    }
    String status = String.valueOf(current.get("status"));
    if (!List.of("awaiting_payment", "payment_sent", "confirmed").contains(status)) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Envoyez le recu apres le paiement", locale));
      return response;
    }
    String url = fileStorage.storeReceipt(file, EmailTemplates.guestApp(appProperties));
    Map<String, Object> updated = visitRequests.setPaymentReceipt(id, url).orElse(current);
    if (!isChatLocked(current)) {
      saveMessage(
          id,
          current,
          user,
          "Reçu de paiement",
          url,
          originalFileName(file),
          file.getContentType(),
          new Response<>(),
          locale);
    }
    normalizeVisit(updated);
    response.setItem(updated);
    response.setStatus(functionalError.success("Recu envoye", locale));
    return response;
  }

  private EmailService.Attachment stayContractAttachment(
      UUID visitId,
      String title,
      String location,
      String checkIn,
      String checkOut,
      String guestName,
      String guestSignedAt,
      String hostName,
      String hostSignedAt) {
    try {
      byte[] pdf =
          StayContractPdf.render(
              new StayContractPdf.Data(
                  visitId,
                  title,
                  location,
                  checkIn,
                  checkOut,
                  guestName,
                  guestSignedAt,
                  hostName,
                  hostSignedAt));
      return new EmailService.Attachment(StayContractPdf.filename(visitId), pdf);
    } catch (Exception e) {
      log.warn("Stay contract PDF not attached for visit {}: {}", visitId, e.getMessage());
      return null;
    }
  }

  private boolean sameId(Object raw, UUID id) {
    return raw != null && id != null && raw.toString().equalsIgnoreCase(id.toString());
  }

  private String agreementUrl(UUID visitId) {
    return EmailTemplates.guestApp(appProperties) + "/visits/" + visitId + "/agreement";
  }

  private String hostAgreementUrl(UUID visitId) {
    return EmailTemplates.hostApp(appProperties) + "/owner/visits/" + visitId + "/agreement";
  }

  private String hostVisitsUrl() {
    return EmailTemplates.hostApp(appProperties) + "/owner/visits";
  }

  private String guestVisitsUrl() {
    return EmailTemplates.guestApp(appProperties) + "/visits";
  }

  private String visitUrl(UUID visitId) {
    return EmailTemplates.guestApp(appProperties) + "/visits/" + visitId;
  }

  private String userName(UUID userId) {
    if (userId == null) return "";
    return users.findById(userId).map(EmailTemplates::personName).orElse("");
  }

  private static void hideKeyCode(Map<String, Object> item) {
    if (item != null) item.remove("key_code");
  }

  private void exposeIdentityLinks(Map<String, Object> item) {
    if (item == null || item.get("id") == null) return;
    String id = item.get("id").toString();
    if (item.get("requester_selfie_url") != null) {
      item.put("requester_selfie_url", "/api/visit-requests/" + id + "/identity/selfie");
    }
    if (item.get("requester_id_photo_url") != null) {
      item.put("requester_id_photo_url", "/api/visit-requests/" + id + "/identity/id-card");
    }
    if (item.get("requester_id_back_url") != null) {
      item.put("requester_id_back_url", "/api/visit-requests/" + id + "/identity/id-back");
    }
  }

  private void normalizeVisit(Map<String, Object> visit) {
    if (visit == null) return;
    Object amount = visit.get("extension_amount");
    if (amount instanceof BigDecimal money) {
      visit.put("extension_amount", money.setScale(0, RoundingMode.HALF_UP).intValue());
    }
    visit.put("overstay", isOverstay(visit));
    visit.put("can_close", canClose(visit));
    visit.put("chat_locked", isChatLocked(visit));
    visit.put("can_close_chat", canCloseChat(visit));
  }

  private Response<Map<String, Object>> saveMessage(
      UUID id,
      Map<String, Object> visit,
      AuthUser user,
      String trimmed,
      String attachmentUrl,
      String attachmentName,
      String attachmentType,
      Response<Map<String, Object>> response,
      Locale locale) {
    if (trimmed.length() > 2000) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Message trop long", locale));
      return response;
    }
    Map<String, Object> created =
        visitMessages.create(id, user.id(), trimmed, attachmentUrl, attachmentName, attachmentType);
    created.put("sender_name", EmailTemplates.personName(users.findById(user.id()).orElse(null)));
    created.put("sender_role", user.role());
    exposeMessageAttachment(id, created);
    notifyVisitMessage(visit, user, created);
    response.setItem(created);
    response.setStatus(functionalError.success("Message", locale));
    return response;
  }

  private static void exposeMessageAttachment(UUID visitId, Map<String, Object> message) {
    if (message == null || message.get("attachment_url") == null || message.get("id") == null) return;
    message.put(
        "attachment_url",
        "/api/visit-requests/" + visitId + "/messages/" + message.get("id") + "/file");
  }

  private boolean rejectIfChatLocked(
      Map<String, Object> visit, Response<?> response, Locale locale) {
    if (!isChatLocked(visit)) return false;
    response.setHasError(true);
    response.setStatus(functionalError.invalidData("Cette discussion est fermee", locale));
    return true;
  }

  private static boolean isChatLocked(Map<String, Object> visit) {
    if (visit.get("chat_closed_at") != null || visit.get("closed_at") != null) return true;
    String status = String.valueOf(visit.get("status"));
    return "cancelled".equals(status) || "declined".equals(status);
  }

  private static boolean canCloseChat(Map<String, Object> visit) {
    if (isChatLocked(visit)) return false;
    if (visit.get("closed_at") != null) return true;
    String status = String.valueOf(visit.get("status"));
    if (!List.of("confirmed", "payment_sent").contains(status)) return false;
    LocalDate out = parseDate(visit.get("check_out"));
    return out == null || !out.isAfter(LocalDate.now());
  }

  private static String originalFileName(MultipartFile file) {
    String name = file.getOriginalFilename();
    if (name == null || name.isBlank()) return "document";
    String base = name.replace('\\', '/');
    int slash = base.lastIndexOf('/');
    if (slash >= 0) base = base.substring(slash + 1);
    base = base.trim();
    if (base.isEmpty()) return "document";
    return base.length() > 200 ? base.substring(0, 200) : base;
  }

  private static boolean isOverstay(Map<String, Object> visit) {
    if (visit.get("closed_at") != null) return false;
    String status = String.valueOf(visit.get("status"));
    if (!List.of("confirmed", "payment_sent").contains(status)) return false;
    LocalDate out = parseDate(visit.get("check_out"));
    return out != null && out.isBefore(LocalDate.now());
  }

  private static boolean canClose(Map<String, Object> visit) {
    if (visit.get("closed_at") != null) return false;
    String status = String.valueOf(visit.get("status"));
    if (!List.of("confirmed", "payment_sent").contains(status)) return false;
    LocalDate out = parseDate(visit.get("check_out"));
    return out == null || !out.isAfter(LocalDate.now());
  }

  private void attachHostOnlyGuestFile(Map<String, Object> visit) {
    if (visit == null || visit.get("user_id") == null) return;
    UUID guestId = UUID.fromString(visit.get("user_id").toString());
    Map<String, Object> stats = guestReviews.statistics(guestId);
    visit.put("guest_rating_avg", stats.get("average"));
    visit.put("guest_rating_count", stats.get("count"));
    visit.put("guest_host_notes", guestReviews.findByGuestForHosts(guestId));
    guestReviews.findByVisit(UUID.fromString(visit.get("id").toString())).ifPresent(r -> visit.put("host_guest_review", r));
  }

  private static void hideHostOnlyGuestFile(Map<String, Object> visit) {
    if (visit == null) return;
    visit.remove("guest_rating_avg");
    visit.remove("guest_rating_count");
    visit.remove("guest_host_notes");
    visit.remove("host_guest_review");
    visit.remove("guest_review_note");
  }

  private static UUID ownerId(Map<String, Object> item, Map<String, Object> fallback) {
    Object raw = item.get("property_owner_id");
    if (raw == null && fallback != null) raw = fallback.get("property_owner_id");
    return raw == null ? null : UUID.fromString(raw.toString());
  }

  private static LocalDate parseDate(Object raw) {
    if (raw == null) return null;
    try {
      return LocalDate.parse(raw.toString().substring(0, 10));
    } catch (Exception e) {
      return null;
    }
  }

  private static BigDecimal extraNightsAmount(
      Map<String, Object> visit, LocalDate currentOut, LocalDate newOut) {
    BigDecimal unit = toMoney(visit.get("property_price"));
    if (unit == null) unit = BigDecimal.ZERO;
    long nights = ChronoUnit.DAYS.between(currentOut, newOut);
    if (nights < 1) nights = 1;
    return unit.multiply(BigDecimal.valueOf(nights)).setScale(2, RoundingMode.HALF_UP);
  }

  private static BigDecimal toMoney(Object raw) {
    if (raw == null) return null;
    if (raw instanceof BigDecimal money) return money;
    if (raw instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
    try {
      return new BigDecimal(raw.toString());
    } catch (Exception e) {
      return null;
    }
  }

  private static String clock(Object raw) {
    if (raw == null) return null;
    String value = raw.toString().trim();
    if (value.matches("\\d{2}:\\d{2}")) return value + ":00";
    if (value.matches("\\d{2}:\\d{2}:\\d{2}")) return value;
    return null;
  }

  private static String stayWhen(Object date, String time) {
    String day = date == null ? "" : date.toString();
    if (time == null || time.isBlank()) return day;
    String hour = time.length() >= 5 ? time.substring(0, 5) : time;
    return day.isBlank() ? hour : day + " · " + hour;
  }

  private static UUID uuid(Object v) {
    if (v == null) return null;
    return UUID.fromString(v.toString());
  }

  private static String str(Object v) {
    return v == null ? null : v.toString();
  }

  private static Integer intOrNull(Object v) {
    if (v == null) return null;
    if (v instanceof Number n) return n.intValue();
    return Integer.parseInt(v.toString());
  }
}
