package com.maresi.api.business;

import com.maresi.api.contracts.FunctionalError;
import com.maresi.api.contracts.Request;
import com.maresi.api.contracts.Response;
import com.maresi.api.repository.NotificationRepository;
import com.maresi.api.repository.PropertyRepository;
import com.maresi.api.repository.VisitRequestRepository;
import com.maresi.api.security.AuthUser;
import com.maresi.api.security.SecurityUtils;
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
  private final FunctionalError functionalError;

  public VisitRequestBusiness(
      VisitRequestRepository visitRequests,
      PropertyRepository properties,
      NotificationRepository notifications,
      FunctionalError functionalError) {
    this.visitRequests = visitRequests;
    this.properties = properties;
    this.notifications = notifications;
    this.functionalError = functionalError;
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
    if (body.get("visit_date") == null || body.get("visit_time") == null) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("visit_date, visit_time", locale));
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
            body.get("visit_date"),
            str(body.get("visit_time")),
            intOrNull(body.get("guests_count")),
            str(body.get("contact_phone")),
            idCard);

    notifyVisitRequestSubmitted(user.id(), listingId, String.valueOf(property.get("title")));

    response.setItem(created);
    response.setStatus(functionalError.success("Demande de visite", locale));
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

  public Response<Map<String, Object>> listForOwner(Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    var items = visitRequests.findByPropertyOwner(SecurityUtils.requireUser().id());
    response.setItems(items);
    response.setCount((long) items.size());
    response.setStatus(functionalError.success("Demandes proprietaire", locale));
    return response;
  }

  public Response<Map<String, Object>> updateStatus(
      UUID id, Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser owner = SecurityUtils.requireUser();
    String status = str(request.getData().get("status"));
    if (status == null || !List.of("pending", "accepted", "declined").contains(status)) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Statut invalide", locale));
      return response;
    }
    String storedStatus = "accepted".equals(status) ? "awaiting_payment" : status;
    Map<String, Object> updated =
        visitRequests
            .updateStatus(id, storedStatus, owner.id(), str(request.getData().get("ownerNote")))
            .orElse(null);
    if (updated == null) {
      response.setHasError(true);
      response.setStatus(functionalError.dataNotFound("Demande introuvable", locale));
      return response;
    }
    UUID requesterId = UUID.fromString(updated.get("user_id").toString());
    UUID listingId = UUID.fromString(updated.get("property_id").toString());
    if ("awaiting_payment".equals(storedStatus)) {
      notifications.create(
          requesterId,
          "reservation",
          "Paiement requis",
          "Votre demande a ete acceptee. Payez pour confirmer la reservation.",
          listingId);
    } else {
      notifyVisitRequestStatusUpdated(requesterId, listingId, status);
    }
    response.setItem(updated);
    response.setStatus(functionalError.success("Statut mis a jour", locale));
    return response;
  }

  private void notifyVisitRequestSubmitted(UUID userId, UUID listingId, String propertyTitle) {
    notifications.create(
        userId,
        "reservation",
        "Demande de visite envoyee",
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
