package com.maresi.api.business;

import com.maresi.api.config.AppProperties;
import com.maresi.api.contracts.FunctionalError;
import com.maresi.api.contracts.Request;
import com.maresi.api.contracts.Response;
import com.maresi.api.repository.PushSubscriptionRepository;
import com.maresi.api.security.AuthUser;
import com.maresi.api.security.SecurityUtils;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class PushBusiness {
  private static final Set<String> APPS = Set.of("web", "host", "admin");

  private final AppProperties props;
  private final PushSubscriptionRepository subscriptions;
  private final FunctionalError functionalError;

  public PushBusiness(
      AppProperties props,
      PushSubscriptionRepository subscriptions,
      FunctionalError functionalError) {
    this.props = props;
    this.subscriptions = subscriptions;
    this.functionalError = functionalError;
  }

  public Response<Map<String, Object>> vapidPublic(Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    if (!props.getPush().isConfigured()) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Notifications push non configurees", locale));
      return response;
    }
    Map<String, Object> item = new LinkedHashMap<>();
    item.put("public_key", props.getPush().getVapidPublicKey().trim());
    response.setItem(item);
    response.setStatus(functionalError.success("VAPID", locale));
    return response;
  }

  public Response<Map<String, Object>> subscribe(Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    if (!props.getPush().isConfigured()) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Notifications push non configurees", locale));
      return response;
    }
    AuthUser user = SecurityUtils.requireUser();
    Map<String, Object> body = request.getData() == null ? Map.of() : request.getData();
    String endpoint = str(body.get("endpoint"));
    String p256dh = str(body.get("p256dh"));
    String auth = str(body.get("auth"));
    Object keys = body.get("keys");
    if (keys instanceof Map<?, ?> km) {
      if (p256dh == null) p256dh = str(km.get("p256dh"));
      if (auth == null) auth = str(km.get("auth"));
    }
    String app = str(body.get("app"));
    if (app == null || !APPS.contains(app)) app = "web";
    if (endpoint == null || p256dh == null || auth == null) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("endpoint, keys", locale));
      return response;
    }
    Map<String, Object> saved = subscriptions.upsert(user.id(), endpoint, p256dh, auth, app);
    response.setItem(saved);
    response.setStatus(functionalError.success("Abonnement push", locale));
    return response;
  }

  public Response<Map<String, Object>> unsubscribe(Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    Map<String, Object> body = request.getData() == null ? Map.of() : request.getData();
    String endpoint = str(body.get("endpoint"));
    if (endpoint == null) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("endpoint", locale));
      return response;
    }
    int removed = subscriptions.deleteByUserAndEndpoint(user.id(), endpoint);
    response.setItem(Map.of("removed", removed));
    response.setStatus(functionalError.success("Push desactive", locale));
    return response;
  }

  private static String str(Object v) {
    if (v == null) return null;
    String s = v.toString().trim();
    return s.isEmpty() ? null : s;
  }
}
