package com.maresi.api.service;

import com.maresi.api.business.NotificationBusiness;
import com.maresi.api.contracts.Response;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class NotificationService {
  private final NotificationBusiness notificationBusiness;

  public NotificationService(NotificationBusiness notificationBusiness) {
    this.notificationBusiness = notificationBusiness;
  }

  public Response<Map<String, Object>> list(Locale locale) {
    return notificationBusiness.list(locale);
  }

  public Response<Map<String, Object>> markAllRead(Locale locale) {
    return notificationBusiness.markAllRead(locale);
  }

  public Response<Map<String, Object>> markOneRead(UUID id, Locale locale) {
    return notificationBusiness.markOneRead(id, locale);
  }
}
