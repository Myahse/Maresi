package com.maresi.api.business;

import com.maresi.api.contracts.FunctionalError;
import com.maresi.api.contracts.Request;
import com.maresi.api.contracts.Response;
import com.maresi.api.realtime.RealtimeEventPublisher;
import com.maresi.api.repository.HostApplicationRepository;
import com.maresi.api.repository.NotificationRepository;
import com.maresi.api.repository.UserRepository;
import com.maresi.api.security.AuthUser;
import com.maresi.api.security.JwtService;
import com.maresi.api.security.SecurityUtils;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class HostApplicationBusiness {
  private final HostApplicationRepository applications;
  private final UserRepository users;
  private final NotificationRepository notifications;
  private final JwtService jwtService;
  private final RealtimeEventPublisher realtime;
  private final FunctionalError functionalError;

  public HostApplicationBusiness(
      HostApplicationRepository applications,
      UserRepository users,
      NotificationRepository notifications,
      JwtService jwtService,
      RealtimeEventPublisher realtime,
      FunctionalError functionalError) {
    this.applications = applications;
    this.users = users;
    this.notifications = notifications;
    this.jwtService = jwtService;
    this.realtime = realtime;
    this.functionalError = functionalError;
  }

  public Response<Map<String, Object>> submit(Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    if ("owner".equals(user.role()) || "admin".equals(user.role())) {
      response.setHasError(true);
      response.setStatus(functionalError.disallowed("Compte deja hote ou admin", locale));
      return response;
    }
    if (applications.hasPending(user.id())) {
      response.setHasError(true);
      response.setStatus(functionalError.dataExist("Demande deja en attente", locale));
      return response;
    }

    Map<String, Object> body = request.getData() != null ? request.getData() : Map.of();
    String fullName = str(body.get("fullName"));
    if (fullName == null) fullName = str(body.get("full_name"));
    String phone = str(body.get("phone"));
    String city = str(body.get("city"));
    String message = str(body.get("message"));
    String idCard = str(body.get("id_card"));
    if (idCard == null) idCard = str(body.get("idCard"));

    Map<String, Object> dbUser = users.findById(user.id()).orElse(null);
    if (fullName == null && dbUser != null) fullName = str(dbUser.get("full_name"));
    if (phone == null && dbUser != null) phone = str(dbUser.get("phone"));

    if (fullName == null || fullName.isBlank()) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("full_name", locale));
      return response;
    }
    if (phone == null || phone.isBlank()) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("phone", locale));
      return response;
    }

    Map<String, Object> created =
        applications.create(user.id(), fullName.trim(), phone.trim(), city, message, idCard);
    notifications.create(
        user.id(),
        "host_application",
        "Demande hote envoyee",
        "Votre demande pour devenir hote est en attente de validation.",
        null);
    realtime.publish("host.application.submitted", created, user.id(), null, true);

    response.setItem(created);
    response.setStatus(functionalError.success("Demande hote", locale));
    return response;
  }

  public Response<Map<String, Object>> mine(Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    Map<String, Object> item = applications.findLatestByUser(user.id()).orElse(null);
    if (item == null) {
      response.setHasError(true);
      response.setStatus(functionalError.dataNotFound("Aucune demande", locale));
      return response;
    }
    response.setItem(item);
    response.setStatus(functionalError.success("Demande hote", locale));
    return response;
  }

  public Response<Map<String, Object>> listForAdmin(String status, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    requireAdmin();
    List<Map<String, Object>> items = applications.findAll(status);
    response.setItems(items);
    response.setCount((long) items.size());
    response.setStatus(functionalError.success("Demandes hote", locale));
    return response;
  }

  public Response<Map<String, Object>> review(UUID id, Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser admin = requireAdmin();
    Map<String, Object> body = request.getData() != null ? request.getData() : Map.of();
    String status = str(body.get("status"));
    if (status == null || !List.of("approved", "rejected").contains(status)) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Statut invalide", locale));
      return response;
    }
    String adminNote = str(body.get("admin_note"));
    if (adminNote == null) adminNote = str(body.get("adminNote"));

    Map<String, Object> updated = applications.review(id, status, adminNote, admin.id()).orElse(null);
    if (updated == null) {
      response.setHasError(true);
      response.setStatus(functionalError.dataNotFound("Demande introuvable ou deja traitee", locale));
      return response;
    }

    UUID applicantId = UUID.fromString(updated.get("user_id").toString());
    Map<String, Object> payload = new LinkedHashMap<>(updated);

    if ("approved".equals(status)) {
      Map<String, Object> owner = users.updateRole(applicantId, "owner").orElse(null);
      if (owner != null) {
        String token =
            jwtService.sign(
                applicantId,
                str(owner.get("email")),
                "owner",
                str(owner.get("phone")));
        payload.put("user", owner);
        payload.put("token", token);
      }
      notifications.create(
          applicantId,
          "host_application",
          "Compte hote active",
          "Votre demande a ete acceptee. Connectez-vous a l'application hote.",
          null);
    } else {
      notifications.create(
          applicantId,
          "host_application",
          "Demande hote refusee",
          adminNote != null && !adminNote.isBlank()
              ? adminNote
              : "Votre demande pour devenir hote a ete refusee.",
          null);
    }

    realtime.publish("host.application.reviewed", payload, applicantId, null, true);
    response.setItem(payload);
    response.setStatus(functionalError.success("Demande traitee", locale));
    return response;
  }

  private AuthUser requireAdmin() {
    AuthUser user = SecurityUtils.requireUser();
    if (!"admin".equals(user.role())) {
      throw com.maresi.api.exception.ApiException.of(403, "Admin required");
    }
    return user;
  }

  private static String str(Object v) {
    return v == null ? null : v.toString().isBlank() ? null : v.toString();
  }
}
