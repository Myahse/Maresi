package com.maresi.api.service;

import com.maresi.api.business.PushBusiness;
import com.maresi.api.contracts.Request;
import com.maresi.api.contracts.Response;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class PushService {
  private final PushBusiness pushBusiness;

  public PushService(PushBusiness pushBusiness) {
    this.pushBusiness = pushBusiness;
  }

  public Response<Map<String, Object>> vapidPublic(Locale locale) {
    return pushBusiness.vapidPublic(locale);
  }

  public Response<Map<String, Object>> subscribe(Request<Map<String, Object>> request, Locale locale) {
    return pushBusiness.subscribe(request, locale);
  }

  public Response<Map<String, Object>> unsubscribe(
      Request<Map<String, Object>> request, Locale locale) {
    return pushBusiness.unsubscribe(request, locale);
  }
}
