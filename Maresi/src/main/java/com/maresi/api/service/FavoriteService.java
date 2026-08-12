package com.maresi.api.service;

import com.maresi.api.business.FavoriteBusiness;
import com.maresi.api.contracts.Request;
import com.maresi.api.contracts.Response;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class FavoriteService {
  private final FavoriteBusiness favoriteBusiness;

  public FavoriteService(FavoriteBusiness favoriteBusiness) {
    this.favoriteBusiness = favoriteBusiness;
  }

  public Response<Map<String, Object>> list(Locale locale) {
    return favoriteBusiness.list(locale);
  }

  public Response<Map<String, Object>> add(Request<Map<String, Object>> request, Locale locale) {
    return favoriteBusiness.add(request, locale);
  }

  public Response<Map<String, Object>> remove(UUID propertyId, Locale locale) {
    return favoriteBusiness.remove(propertyId, locale);
  }
}
