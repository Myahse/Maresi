package com.maresi.api.business;

import com.maresi.api.contracts.FunctionalError;
import com.maresi.api.contracts.Request;
import com.maresi.api.contracts.Response;
import com.maresi.api.repository.FavoriteRepository;
import com.maresi.api.security.AuthUser;
import com.maresi.api.security.SecurityUtils;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class FavoriteBusiness {
  private final FavoriteRepository favorites;
  private final FunctionalError functionalError;

  public FavoriteBusiness(FavoriteRepository favorites, FunctionalError functionalError) {
    this.favorites = favorites;
    this.functionalError = functionalError;
  }

  public Response<Map<String, Object>> list(Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    var items = favorites.findByUser(user.id());
    response.setItems(items);
    response.setCount((long) items.size());
    response.setStatus(functionalError.success("Favoris", locale));
    return response;
  }

  public Response<Map<String, Object>> add(Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    Object raw = request.getData().get("propertyId");
    if (raw == null) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("propertyId", locale));
      return response;
    }
    UUID propertyId = UUID.fromString(raw.toString());
    favorites.add(user.id(), propertyId);
    response.setItem(Map.of("propertyId", propertyId));
    response.setStatus(functionalError.success("Favori ajoute", locale));
    return response;
  }

  public Response<Map<String, Object>> remove(UUID propertyId, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    favorites.remove(user.id(), propertyId);
    response.setStatus(functionalError.success("Favori retire", locale));
    return response;
  }
}
