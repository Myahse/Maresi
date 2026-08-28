package com.maresi.api.service;

import com.maresi.api.business.HostApplicationBusiness;
import com.maresi.api.contracts.Request;
import com.maresi.api.contracts.Response;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class HostApplicationService {
  private final HostApplicationBusiness business;

  public HostApplicationService(HostApplicationBusiness business) {
    this.business = business;
  }

  public Response<Map<String, Object>> submit(Request<Map<String, Object>> request, Locale locale) {
    return business.submit(request, locale);
  }

  public Response<Map<String, Object>> mine(Locale locale) {
    return business.mine(locale);
  }

  public Response<Map<String, Object>> listForAdmin(String status, Locale locale) {
    return business.listForAdmin(status, locale);
  }

  public Response<Map<String, Object>> review(
      UUID id, Request<Map<String, Object>> request, Locale locale) {
    return business.review(id, request, locale);
  }
}
