package com.maresi.api.service;

import com.maresi.api.business.AdminMonitorBusiness;
import com.maresi.api.contracts.Request;
import com.maresi.api.contracts.Response;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class AdminMonitorService {
  private final AdminMonitorBusiness business;

  public AdminMonitorService(AdminMonitorBusiness business) {
    this.business = business;
  }

  public Response<Map<String, Object>> overview(Locale locale) {
    return business.overview(locale);
  }

  public Response<Map<String, Object>> users(Locale locale) {
    return business.users(locale);
  }

  public Response<Map<String, Object>> payments(Locale locale) {
    return business.payments(locale);
  }

  public Response<Map<String, Object>> subscriptions(Locale locale) {
    return business.subscriptions(locale);
  }

  public Response<Map<String, Object>> updateSubscription(
      UUID userId, Request<Map<String, Object>> request, Locale locale) {
    return business.updateSubscription(userId, request, locale);
  }

  public Response<Map<String, Object>> updatePayment(
      UUID id, Request<Map<String, Object>> request, Locale locale) {
    return business.updatePayment(id, request, locale);
  }
}
