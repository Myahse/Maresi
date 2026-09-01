package com.maresi.api.business;

import com.maresi.api.contracts.FunctionalError;
import com.maresi.api.contracts.Response;
import com.maresi.api.exception.ApiException;
import com.maresi.api.repository.ActivityRepository;
import com.maresi.api.repository.NotificationRepository;
import com.maresi.api.repository.UserRepository;
import com.maresi.api.security.AuthUser;
import com.maresi.api.security.SecurityUtils;
import com.maresi.api.service.EmailService;
import com.maresi.api.service.EmailTemplates;
import com.maresi.api.service.FileStorageService;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class UserBusiness {
  private final UserRepository users;
  private final FileStorageService fileStorage;
  private final FunctionalError functionalError;
  private final EmailService email;
  private final NotificationRepository notifications;
  private final ActivityRepository activity;
  private final HostStatus hostStatus;

  public UserBusiness(
      UserRepository users,
      FileStorageService fileStorage,
      FunctionalError functionalError,
      EmailService email,
      NotificationRepository notifications,
      ActivityRepository activity,
      HostStatus hostStatus) {
    this.users = users;
    this.fileStorage = fileStorage;
    this.functionalError = functionalError;
    this.email = email;
    this.notifications = notifications;
    this.activity = activity;
    this.hostStatus = hostStatus;
  }

  public Response<Map<String, Object>> me(Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    Map<String, Object> profile = users.findIdentity(user.id()).orElse(null);
    if (profile == null) {
      response.setHasError(true);
      response.setStatus(functionalError.dataNotFound("Compte introuvable", locale));
      return response;
    }
    exposeIdentityLinks(profile, user.id());
    hostStatus.attach(profile);
    if ("client".equals(String.valueOf(profile.get("role"))) && hostStatus.isHostTrack(profile)) {
      users.updateRole(user.id(), "owner").ifPresent(updated -> profile.put("role", "owner"));
    }
    response.setItem(profile);
    response.setStatus(functionalError.success("Profil", locale));
    return response;
  }

  public Response<Map<String, Object>> updateIdentity(
      String idCard,
      MultipartFile selfie,
      MultipartFile idCardPhoto,
      MultipartFile idCardBack,
      String baseUrl,
      Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    Map<String, Object> current = users.findIdentity(user.id()).orElse(null);
    if (current == null) {
      response.setHasError(true);
      response.setStatus(functionalError.dataNotFound("Compte introuvable", locale));
      return response;
    }
    String card = str(idCard);
    boolean hasCard = card != null && !card.isBlank();
    boolean hasSelfie = selfie != null && !selfie.isEmpty();
    boolean hasFront = idCardPhoto != null && !idCardPhoto.isEmpty();
    boolean hasBack = idCardBack != null && !idCardBack.isEmpty();
    if (!hasCard && !hasSelfie && !hasFront && !hasBack) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("id_card ou photo", locale));
      return response;
    }
    if (hasCard && !validIdCard(card)) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Numero de piece d'identite invalide", locale));
      return response;
    }
    String selfieUrl = hasSelfie ? fileStorage.storeIdentityImage(selfie, baseUrl) : null;
    String frontUrl = hasFront ? fileStorage.storeIdentityImage(idCardPhoto, baseUrl) : null;
    String backUrl = hasBack ? fileStorage.storeIdentityImage(idCardBack, baseUrl) : null;
    boolean wasSuspended = isSuspended(current);
    users.updateIdentity(user.id(), hasCard ? card.trim() : null, selfieUrl, frontUrl, backUrl, wasSuspended);
    if (wasSuspended) {
      notifications.create(
          user.id(),
          "account",
          "Dossier mis a jour",
          "Votre compte n'est plus suspendu. Un administrateur verifiera vos nouvelles pieces.",
          null);
      for (UUID adminId : users.findIdsByRole("admin")) {
        notifications.create(
            adminId,
            "account",
            "Dossier identite corrige",
            EmailTemplates.personName(current) + " a mis a jour ses pieces d'identite.",
            null);
        email.sendToUser(
            adminId,
            EmailTemplates.identityUpdatedAdmin(
                EmailTemplates.personName(current), str(current.get("email")), str(current.get("role"))));
      }
      activity.record(
          "user.identity.updated",
          "user",
          user.id(),
          user.id(),
          "Pieces d'identite mises a jour (suspension levee)",
          Map.of("was_suspended", true));
    } else {
      activity.record(
          "user.identity.updated",
          "user",
          user.id(),
          user.id(),
          "Pieces d'identite mises a jour",
          Map.of());
    }
    Map<String, Object> profile = users.findIdentity(user.id()).orElse(current);
    exposeIdentityLinks(profile, user.id());
    response.setItem(profile);
    response.setStatus(functionalError.success("Dossier mis a jour", locale));
    return response;
  }

  public FileStorageService.StoredMedia loadIdentity(UUID userId, String kind) {
    AuthUser viewer = SecurityUtils.requireUser();
    boolean self = viewer.id().equals(userId);
    boolean admin = "admin".equals(viewer.role());
    if (!self && !admin) {
      throw ApiException.of(403, "Access denied");
    }
    Map<String, Object> row = users.findIdentity(userId).orElse(null);
    if (row == null) return null;
    String stored =
        switch (kind == null ? "" : kind) {
          case "id-front", "id-card" -> str(row.get("id_card_photo_url"));
          case "id-back" -> str(row.get("id_card_back_url"));
          default -> str(row.get("selfie_url"));
        };
    return fileStorage.loadIdentityImage(stored);
  }

  public boolean rejectIfSuspended(Response<?> response, UUID userId, Locale locale) {
    Map<String, Object> row = users.findById(userId).orElse(null);
    if (!isSuspended(row)) return false;
    response.setHasError(true);
    response.setStatus(
        functionalError.disallowed(
            "Votre compte est suspendu. Mettez a jour vos informations d'identite pour continuer.",
            locale));
    return true;
  }

  public static boolean isSuspended(Map<String, Object> user) {
    if (user == null) return false;
    Object raw = user.get("account_status");
    return raw != null && "suspended".equalsIgnoreCase(raw.toString());
  }

  public static void exposeIdentityLinks(Map<String, Object> item, UUID userId) {
    if (item == null || userId == null) return;
    String base = "/api/users/" + userId + "/identity/";
    if (item.get("selfie_url") != null) item.put("selfie_url", base + "selfie");
    if (item.get("id_card_photo_url") != null) item.put("id_card_photo_url", base + "id-front");
    if (item.get("id_card_back_url") != null) item.put("id_card_back_url", base + "id-back");
  }

  private static boolean validIdCard(String idCard) {
    if (idCard == null) return false;
    String trimmed = idCard.trim();
    if (trimmed.length() < 5) return false;
    return trimmed.matches("[A-Za-z0-9\\-/\\s]+");
  }

  private static String str(Object v) {
    return v == null ? null : v.toString();
  }
}
