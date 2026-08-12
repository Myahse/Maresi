package com.maresi.api.business;

import com.maresi.api.contracts.FunctionalError;
import com.maresi.api.contracts.Response;
import com.maresi.api.repository.NotificationRepository;
import com.maresi.api.security.AuthUser;
import com.maresi.api.security.SecurityUtils;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class NotificationBusiness {
  private final NotificationRepository notifications;
  private final FunctionalError functionalError;

  public NotificationBusiness(NotificationRepository notifications, FunctionalError functionalError) {
    this.notifications = notifications;
    this.functionalError = functionalError;
  }

  public Response<Map<String, Object>> list(Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    var items = notifications.findByUser(SecurityUtils.requireUser().id());
    response.setItems(items);
    response.setCount((long) items.size());
    response.setStatus(functionalError.success("Notifications", locale));
    return response;
  }

  public Response<Map<String, Object>> markAllRead(Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    int updated = notifications.markAllRead(SecurityUtils.requireUser().id());
    response.setItem(Map.of("updated", updated));
    response.setStatus(functionalError.success("Notifications lues", locale));
    return response;
  }

  public Response<Map<String, Object>> markOneRead(UUID id, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    Map<String, Object> updated = notifications.markRead(user.id(), id).orElse(null);
    if (updated == null) {
      response.setHasError(true);
      response.setStatus(functionalError.dataNotFound("Notification introuvable", locale));
      return response;
    }
    response.setItem(updated);
    response.setStatus(functionalError.success("Notification lue", locale));
    return response;
  }
}
