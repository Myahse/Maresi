package com.maresi.api.business;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.maresi.api.config.AppProperties;
import com.maresi.api.contracts.FunctionalError;
import com.maresi.api.contracts.Request;
import com.maresi.api.contracts.Response;
import com.maresi.api.exception.ApiException;
import com.maresi.api.realtime.RealtimeEventPublisher;
import com.maresi.api.repository.NotificationRepository;
import com.maresi.api.repository.OwnerSubscriptionRepository;
import com.maresi.api.repository.PaymentRepository;
import com.maresi.api.repository.UserRepository;
import com.maresi.api.repository.VisitRequestRepository;
import com.maresi.api.security.AuthUser;
import com.maresi.api.security.SecurityUtils;
import com.maresi.api.service.GeniusPayClient;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class PaymentBusiness {
  private final PaymentRepository payments;
  private final OwnerSubscriptionRepository subscriptions;
  private final VisitRequestRepository visitRequests;
  private final UserRepository users;
  private final NotificationRepository notifications;
  private final GeniusPayClient geniusPay;
  private final RealtimeEventPublisher realtime;
  private final AppProperties props;
  private final FunctionalError functionalError;
  private final ObjectMapper objectMapper;

  public PaymentBusiness(
      PaymentRepository payments,
      OwnerSubscriptionRepository subscriptions,
      VisitRequestRepository visitRequests,
      UserRepository users,
      NotificationRepository notifications,
      GeniusPayClient geniusPay,
      RealtimeEventPublisher realtime,
      AppProperties props,
      FunctionalError functionalError,
      ObjectMapper objectMapper) {
    this.payments = payments;
    this.subscriptions = subscriptions;
    this.visitRequests = visitRequests;
    this.users = users;
    this.notifications = notifications;
    this.geniusPay = geniusPay;
    this.realtime = realtime;
    this.props = props;
    this.functionalError = functionalError;
    this.objectMapper = objectMapper;
  }

  public Response<Map<String, Object>> getMySubscription(Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    Map<String, Object> sub = subscriptions.ensureRow(user.id());
    boolean active = subscriptions.isActive(user.id());
    if (!active && "active".equals(String.valueOf(sub.get("status")))) {
      sub = new LinkedHashMap<>(sub);
      sub.put("status", "expired");
    }
    Map<String, Object> item = new LinkedHashMap<>(sub);
    item.put("price_fcfa", props.getPayments().getOwnerSubscriptionFcfa());
    item.put("active", active);
    response.setItem(item);
    response.setStatus(functionalError.success("Abonnement", locale));
    return response;
  }

  public Response<Map<String, Object>> listMyPayments(Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    List<Map<String, Object>> items = payments.findByUser(user.id());
    response.setItems(items);
    response.setCount((long) items.size());
    response.setStatus(functionalError.success("Paiements", locale));
    return response;
  }

  public Response<Map<String, Object>> startSubscription(Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    if (!"owner".equals(user.role())) {
      response.setHasError(true);
      response.setStatus(functionalError.disallowed("Abonnement reserve aux proprietaires", locale));
      return response;
    }

    BigDecimal amount = BigDecimal.valueOf(props.getPayments().getOwnerSubscriptionFcfa());
    Map<String, Object> metadata = new HashMap<>();
    metadata.put("type", "subscription");
    metadata.put("user_id", user.id().toString());

    Map<String, Object> payment =
        payments.create(
            user.id(),
            "subscription",
            null,
            amount,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            "XOF",
            "pending",
            null,
            null,
            metadata);
    metadata.put("payment_id", payment.get("id").toString());

    Map<String, Object> customer = customerFor(user);
    Map<String, Object> gp =
        geniusPay.createCheckoutPayment(
            amount,
            "Abonnement proprietaire Maresi (1 mois)",
            customer,
            props.getPayments().getSuccessUrl(),
            props.getPayments().getErrorUrl(),
            metadata);

    payment =
        payments.updateCheckout(
            UUID.fromString(payment.get("id").toString()),
            String.valueOf(gp.get("reference")),
            String.valueOf(gp.get("checkout_url")));

    response.setItem(payment);
    response.setStatus(functionalError.success("Checkout abonnement", locale));
    return response;
  }

  public Response<Map<String, Object>> startReservationPayment(
      Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    UUID visitRequestId = uuid(request.getData().get("visitRequestId"));
    if (visitRequestId == null) {
      visitRequestId = uuid(request.getData().get("visit_request_id"));
    }
    if (visitRequestId == null) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("visitRequestId", locale));
      return response;
    }

    Map<String, Object> visit = visitRequests.findById(visitRequestId).orElse(null);
    if (visit == null) {
      response.setHasError(true);
      response.setStatus(functionalError.dataNotFound("Demande introuvable", locale));
      return response;
    }
    if (!user.id().toString().equals(String.valueOf(visit.get("user_id")))) {
      response.setHasError(true);
      response.setStatus(functionalError.disallowed("Paiement non autorise", locale));
      return response;
    }
    if (!"awaiting_payment".equals(String.valueOf(visit.get("status")))) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("La reservation n'attend pas de paiement", locale));
      return response;
    }

    BigDecimal amount = computeReservationAmount(visit);
    if (amount.compareTo(BigDecimal.valueOf(200)) < 0) {
      throw ApiException.of(400, "Montant minimum Genius Pay: 200 XOF");
    }

    int percent = props.getPayments().getReservationCommissionPercent();
    BigDecimal commission =
        amount
            .multiply(BigDecimal.valueOf(percent))
            .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    BigDecimal ownerAmount = amount.subtract(commission);

    Map<String, Object> metadata = new HashMap<>();
    metadata.put("type", "reservation");
    metadata.put("user_id", user.id().toString());
    metadata.put("visit_request_id", visitRequestId.toString());
    metadata.put("commission_percent", percent);

    Map<String, Object> payment =
        payments.create(
            user.id(),
            "reservation",
            visitRequestId,
            amount,
            commission,
            ownerAmount,
            "XOF",
            "pending",
            null,
            null,
            metadata);
    metadata.put("payment_id", payment.get("id").toString());

    Map<String, Object> customer = customerFor(user);
    Map<String, Object> gp =
        geniusPay.createCheckoutPayment(
            amount,
            "Reservation Maresi — " + String.valueOf(visit.getOrDefault("property_title", "residence")),
            customer,
            props.getPayments().getSuccessUrl(),
            props.getPayments().getErrorUrl(),
            metadata);

    payment =
        payments.updateCheckout(
            UUID.fromString(payment.get("id").toString()),
            String.valueOf(gp.get("reference")),
            String.valueOf(gp.get("checkout_url")));

    response.setItem(payment);
    response.setStatus(functionalError.success("Checkout reservation", locale));
    return response;
  }

  public Response<Map<String, Object>> handleWebhook(
      String rawBody, String signature, String timestamp, String event, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    if (!geniusPay.verifyWebhookSignature(rawBody, signature, timestamp)) {
      throw ApiException.of(401, "Invalid Genius Pay webhook signature");
    }

    try {
      JsonNode root = objectMapper.readTree(rawBody);
      JsonNode data = root.has("data") ? root.get("data") : root;
      String reference = text(data, "reference", "id", "transaction_id");
      String paymentIdFromMeta = null;
      JsonNode meta = data.get("metadata");
      if (meta != null && meta.has("payment_id")) {
        paymentIdFromMeta = meta.get("payment_id").asText();
      }

      Map<String, Object> payment = null;
      if (reference != null) {
        payment = payments.findByProviderReference(reference).orElse(null);
      }
      if (payment == null && paymentIdFromMeta != null) {
        payment = payments.findById(UUID.fromString(paymentIdFromMeta)).orElse(null);
      }
      if (payment == null) {
        response.setHasError(true);
        response.setStatus(functionalError.dataNotFound("Paiement introuvable", locale));
        return response;
      }

      UUID paymentId = UUID.fromString(payment.get("id").toString());
      String normalizedEvent = event == null ? "" : event.toLowerCase(Locale.ROOT);
      boolean success =
          normalizedEvent.contains("success")
              || normalizedEvent.contains("completed")
              || "completed".equalsIgnoreCase(text(data, "status"));
      boolean failed =
          normalizedEvent.contains("fail")
              || normalizedEvent.contains("expired")
              || "failed".equalsIgnoreCase(text(data, "status"));

      if (success) {
        if ("completed".equals(String.valueOf(payment.get("status")))) {
          response.setItem(payment);
          response.setStatus(functionalError.success("Webhook deja traite", locale));
          return response;
        }
        Map<String, Object> completed = payments.markCompleted(paymentId).orElse(payment);
        applyPaymentSideEffects(completed);
        response.setItem(completed);
        response.setStatus(functionalError.success("Paiement confirme", locale));
        return response;
      }
      if (failed) {
        Map<String, Object> failedPayment = payments.markFailed(paymentId).orElse(payment);
        response.setItem(failedPayment);
        response.setStatus(functionalError.success("Paiement echoue", locale));
        return response;
      }

      response.setItem(payment);
      response.setStatus(functionalError.success("Webhook ignore", locale));
      return response;
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      throw ApiException.of(400, "Invalid webhook payload: " + e.getMessage());
    }
  }

  private void applyPaymentSideEffects(Map<String, Object> payment) {
    String type = String.valueOf(payment.get("type"));
    UUID userId = UUID.fromString(payment.get("user_id").toString());
    UUID paymentId = UUID.fromString(payment.get("id").toString());

    if ("subscription".equals(type)) {
      Instant start = Instant.now();
      Instant end = start.plus(30, ChronoUnit.DAYS);
      subscriptions.upsertActive(userId, start, end, paymentId);
      notifications.create(
          userId,
          "payment",
          "Abonnement active",
          "Votre abonnement proprietaire Maresi est actif pendant 30 jours.",
          null);
      realtime.publish("payment.completed", payment, userId, userId, true);
      return;
    }

    if ("reservation".equals(type) && payment.get("visit_request_id") != null) {
      UUID visitId = UUID.fromString(payment.get("visit_request_id").toString());
      visitRequests.updateStatusById(visitId, "confirmed");
      Map<String, Object> visit = visitRequests.findById(visitId).orElse(null);
      UUID propertyId =
          visit != null && visit.get("property_id") != null
              ? UUID.fromString(visit.get("property_id").toString())
              : null;
      notifications.create(
          userId,
          "payment",
          "Reservation payee",
          "Votre paiement a ete confirme. La reservation est validee.",
          propertyId);
      UUID ownerId = null;
      if (visit != null && visit.get("property_owner_id") != null) {
        ownerId = UUID.fromString(visit.get("property_owner_id").toString());
        notifications.create(
            ownerId,
            "payment",
            "Reservation confirmee",
            "Le client a paye la reservation. Commission plateforme deduite du montant.",
            propertyId);
      }
      realtime.publish("payment.completed", payment, userId, ownerId, true);
    }
  }

  private BigDecimal computeReservationAmount(Map<String, Object> visit) {
    BigDecimal unit = toMoney(visit.get("property_price"));
    if (unit == null) unit = BigDecimal.ZERO;
    Object checkIn = visit.get("check_in");
    Object checkOut = visit.get("check_out");
    if (checkIn != null && checkOut != null) {
      try {
        LocalDate in = LocalDate.parse(String.valueOf(checkIn).substring(0, 10));
        LocalDate out = LocalDate.parse(String.valueOf(checkOut).substring(0, 10));
        long nights = ChronoUnit.DAYS.between(in, out);
        if (nights < 1) nights = 1;
        return unit.multiply(BigDecimal.valueOf(nights)).setScale(2, RoundingMode.HALF_UP);
      } catch (Exception ignored) {
      }
    }
    return unit.setScale(2, RoundingMode.HALF_UP);
  }

  private Map<String, Object> customerFor(AuthUser user) {
    Map<String, Object> customer = new LinkedHashMap<>();
    Map<String, Object> dbUser = users.findById(user.id()).orElse(null);
    String name =
        dbUser != null && dbUser.get("full_name") != null
            ? String.valueOf(dbUser.get("full_name"))
            : user.email();
    customer.put("name", name);
    if (user.email() != null) customer.put("email", user.email());
    if (dbUser != null && dbUser.get("phone") != null) {
      customer.put("phone", String.valueOf(dbUser.get("phone")));
    }
    customer.put("country", "CI");
    return customer;
  }

  private static BigDecimal toMoney(Object v) {
    if (v == null) return null;
    if (v instanceof BigDecimal bd) return bd;
    if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
    return new BigDecimal(v.toString());
  }

  private static UUID uuid(Object v) {
    if (v == null) return null;
    try {
      return UUID.fromString(v.toString());
    } catch (Exception e) {
      return null;
    }
  }

  private static String text(JsonNode node, String... keys) {
    if (node == null) return null;
    for (String key : keys) {
      JsonNode v = node.get(key);
      if (v != null && !v.isNull() && !v.asText().isBlank()) return v.asText();
    }
    return null;
  }
}
