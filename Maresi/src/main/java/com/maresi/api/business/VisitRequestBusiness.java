package com.maresi.api.business;

import com.maresi.api.contracts.FunctionalError;
import com.maresi.api.contracts.Request;
import com.maresi.api.contracts.Response;
import com.maresi.api.exception.ApiException;
import com.maresi.api.realtime.RealtimeEventPublisher;
import com.maresi.api.repository.NotificationRepository;
import com.maresi.api.repository.PaymentRepository;
import com.maresi.api.repository.PropertyRepository;
import com.maresi.api.repository.VisitRequestRepository;
import com.maresi.api.security.AuthUser;
import com.maresi.api.security.SecurityUtils;
import com.maresi.api.config.AppProperties;
import com.maresi.api.service.EmailService;
import com.maresi.api.service.FileStorageService;
import com.maresi.api.service.StayAgreementText;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class VisitRequestBusiness {
  private final VisitRequestRepository visitRequests;
  private final PropertyRepository properties;
  private final NotificationRepository notifications;
  private final PaymentRepository payments;
  private final PaymentBusiness paymentBusiness;
  private final RealtimeEventPublisher realtime;
  private final FunctionalError functionalError;
  private final EmailService email;
  private final FileStorageService fileStorage;
  private final AppProperties appProperties;

  public VisitRequestBusiness(
      VisitRequestRepository visitRequests,
      PropertyRepository properties,
      NotificationRepository notifications,
      PaymentRepository payments,
      PaymentBusiness paymentBusiness,
      RealtimeEventPublisher realtime,
      FunctionalError functionalError,
      EmailService email,
      FileStorageService fileStorage,
      AppProperties appProperties) {
    this.visitRequests = visitRequests;
    this.properties = properties;
    this.notifications = notifications;
    this.payments = payments;
    this.paymentBusiness = paymentBusiness;
    this.realtime = realtime;
    this.functionalError = functionalError;
    this.email = email;
    this.fileStorage = fileStorage;
    this.appProperties = appProperties;
  }

  public Response<Map<String, Object>> create(Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
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

    Map<String, Object> property = properties.findById(listingId).orElse(null);
    if (property == null) {
      response.setHasError(true);
      response.setStatus(functionalError.dataNotFound("Bien introuvable", locale));
      return response;
    }

    Map<String, Object> created =
        visitRequests.create(
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
            stayRate(body.get("stay_rate")));

    notifyVisitRequestSubmitted(user.id(), listingId, String.valueOf(property.get("title")));
    UUID ownerId =
        property.get("owner_id") != null ? UUID.fromString(property.get("owner_id").toString()) : null;
    if (ownerId != null) {
      notifications.create(
          ownerId,
          "reservation",
          "Nouvelle reservation",
          "Un client a demande " + property.get("title") + ".",
          listingId);
    }
    realtime.publish("visit.created", created, user.id(), ownerId, true);
    if (ownerId != null) {
      email.sendToUser(
          ownerId,
          "Maresi — nouvelle reservation",
          "Un client a demande "
              + property.get("title")
              + ".\n"
              + "Sejour : "
              + body.get("check_in")
              + " → "
              + body.get("check_out")
              + "\n"
              + "Telephone : "
              + body.get("contact_phone")
              + "\n"
              + "Piece d'identite : "
              + idCard
              + "\n"
              + "Ouvrez Maresi Hote pour voir la photo, la CNI et accepter ou refuser.");
    }
    email.sendToUser(
        user.id(),
        "Maresi — demande envoyee",
        "Votre demande pour " + property.get("title") + " a ete envoyee a l'hote.");

    response.setItem(created);
    response.setStatus(functionalError.success("Demande de reservation", locale));
    return response;
  }

  public Response<Map<String, Object>> listMine(Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    var items = visitRequests.findByUser(SecurityUtils.requireUser().id());
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
    response.setItem(item);
    response.setStatus(functionalError.success("Demande", locale));
    return response;
  }

  public Response<Map<String, Object>> listForOwner(Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    var items = visitRequests.findByPropertyOwner(SecurityUtils.requireUser().id());
    for (Map<String, Object> item : items) {
      exposeIdentityLinks(item);
      hideKeyCode(item);
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
    String storedStatus = "accepted".equals(status) ? "awaiting_agreement" : status;
    Map<String, Object> updated =
        visitRequests
            .updateStatus(id, storedStatus, user.id(), str(request.getData().get("ownerNote")))
            .orElse(null);
    if (updated == null) {
      response.setHasError(true);
      response.setStatus(functionalError.dataNotFound("Demande introuvable", locale));
      return response;
    }
    UUID requesterId = UUID.fromString(updated.get("user_id").toString());
    UUID listingId = UUID.fromString(updated.get("property_id").toString());
    String title = String.valueOf(updated.get("property_title") == null ? "la residence" : updated.get("property_title"));
    realtime.publish("visit.status_changed", updated, requesterId, user.id(), true);
    if ("awaiting_agreement".equals(storedStatus)) {
      notifications.create(
          requesterId,
          "reservation",
          "Signez l'engagement",
          "Votre demande a ete acceptee. Signez l'engagement de soin du logement, puis payez via GeniusPay.",
          listingId);
      email.sendToUser(
          requesterId,
          "Maresi — demande acceptee",
          "L'hote a accepte votre demande pour "
              + title
              + ".\n\nOuvrez cette page pour lire et signer l'engagement de soin du logement :\n"
              + agreementUrl(id)
              + "\n\nApres signature, vous recevrez un code a 6 chiffres a donner a l'hote. Ensuite, payez l'hote.");
    } else {
      notifyVisitRequestStatusUpdated(requesterId, listingId, status);
      email.sendToUser(
          requesterId,
          "Maresi — demande refusee",
          "L'hote a refuse votre demande pour " + title + ".");
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
    if (!List.of("pending", "awaiting_agreement", "awaiting_key", "awaiting_payment", "payment_sent", "confirmed").contains(currentStatus)) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Cette reservation ne peut plus etre annulee", locale));
      return response;
    }
    if ("confirmed".equals(currentStatus) || "payment_sent".equals(currentStatus)) {
      if (stayHasStarted(current)) {
        response.setHasError(true);
        response.setStatus(
            functionalError.invalidData("Le sejour a commence. L'annulation n'est plus possible.", locale));
        return response;
      }
      String refundError = paymentBusiness.refundPaidStayOnCancel(current);
      if (refundError != null) {
        response.setHasError(true);
        response.setStatus(functionalError.invalidData(refundError, locale));
        return response;
      }
    } else {
      payments.abandonPendingReservations(id);
    }
    Map<String, Object> updated = visitRequests.updateStatusById(id, "cancelled").orElse(current);
    UUID listingId = UUID.fromString(updated.get("property_id").toString());
    UUID ownerId =
        current.get("property_owner_id") != null
            ? UUID.fromString(current.get("property_owner_id").toString())
            : null;
    if (ownerId != null && !"confirmed".equals(currentStatus) && !"payment_sent".equals(currentStatus)) {
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

  private static boolean stayHasStarted(Map<String, Object> visit) {
    Object checkIn = visit.get("check_in");
    if (checkIn == null) return false;
    try {
      LocalDate in = LocalDate.parse(String.valueOf(checkIn).substring(0, 10));
      return !in.isAfter(LocalDate.now());
    } catch (Exception e) {
      return false;
    }
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
    String keyCode = String.format("%06d", java.util.concurrent.ThreadLocalRandom.current().nextInt(1_000_000));
    Map<String, Object> updated = visitRequests.signAgreement(id, user.id(), fullName.trim(), keyCode).orElse(null);
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
        "Code cle",
        "Engagement signe. Donnez le code a 6 chiffres a l'hote pour recuperer la cle, puis payez l'hote.",
        listingId);
    if (ownerId != null) {
      notifications.create(
          ownerId,
          "reservation",
          "Attente du code cle",
          "Le client a signe. Demandez le code a 6 chiffres, saisissez-le, puis le client paiera.",
          listingId);
      email.sendToUser(
          ownerId,
          "Maresi — code cle",
          "Le client a signe l'engagement pour "
              + listingTitle
              + ". Demandez-lui le code a 6 chiffres, saisissez-le dans Maresi Hote, puis il paiera.");
    }
    email.sendToUser(
        user.id(),
        "Maresi — votre code cle",
        "Merci. Votre engagement est enregistre.\nVotre code cle : "
            + keyCode
            + "\n\nDonnez ce code a l'hote pour recuperer la cle. Ensuite, payez l'hote dans Maresi.");
    response.setItem(updated);
    response.setStatus(functionalError.success("Engagement signe", locale));
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
        "L'hote a confirme le code. Payez maintenant l'hote.",
        listingId);
    email.sendToUser(
        requesterId,
        "Maresi — payez l'hote",
        "L'hote a confirme le code cle. Payez l'hote depuis Maresi (Wave ou Orange Money).");
    response.setItem(updated);
    response.setStatus(functionalError.success("Code confirme", locale));
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

  private String agreementUrl(UUID visitId) {
    return StayAgreementText.pageUrl(appProperties.getPayments().getSuccessUrl(), visitId);
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

  private static String stayRate(Object raw) {
    if (raw == null) return "night";
    String value = raw.toString().trim().toLowerCase(Locale.ROOT);
    if ("midday".equals(value) || "full_day".equals(value) || "night".equals(value)) return value;
    return "night";
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
