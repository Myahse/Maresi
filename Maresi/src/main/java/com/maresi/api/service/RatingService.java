package com.maresi.api.service;

import com.maresi.api.business.RatingBusiness;
import com.maresi.api.contracts.Request;
import com.maresi.api.contracts.Response;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class RatingService {
  private final RatingBusiness ratingBusiness;

  public RatingService(RatingBusiness ratingBusiness) {
    this.ratingBusiness = ratingBusiness;
  }

  public Response<Map<String, Object>> list(UUID propertyId, Locale locale) {
    return ratingBusiness.list(propertyId, locale);
  }

  public Response<Map<String, Object>> upsert(
      UUID propertyId, Request<Map<String, Object>> request, Locale locale) {
    return ratingBusiness.upsert(propertyId, request, locale);
  }
}
