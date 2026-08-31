package com.maresi.api.business;

import com.maresi.api.contracts.FunctionalError;
import com.maresi.api.contracts.Response;
import com.maresi.api.exception.ApiException;
import com.maresi.api.repository.UserRepository;
import com.maresi.api.security.AuthUser;
import com.maresi.api.security.SecurityUtils;
import com.maresi.api.service.FileStorageService;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class UserBusiness {
  private final UserRepository users;
  private final FileStorageService fileStorage;
  private final FunctionalError functionalError;

  public UserBusiness(
      UserRepository users, FileStorageService fileStorage, FunctionalError functionalError) {
    this.users = users;
    this.fileStorage = fileStorage;
    this.functionalError = functionalError;
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
    response.setItem(profile);
    response.setStatus(functionalError.success("Profil", locale));
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

  public static void exposeIdentityLinks(Map<String, Object> item, UUID userId) {
    if (item == null || userId == null) return;
    String base = "/api/users/" + userId + "/identity/";
    if (item.get("selfie_url") != null) item.put("selfie_url", base + "selfie");
    if (item.get("id_card_photo_url") != null) item.put("id_card_photo_url", base + "id-front");
    if (item.get("id_card_back_url") != null) item.put("id_card_back_url", base + "id-back");
  }

  private static String str(Object v) {
    return v == null ? null : v.toString();
  }
}
