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
import com.maresi.api.repository.PropertyRepository;
import com.maresi.api.repository.UserRepository;
import com.maresi.api.repository.VisitRequestRepository;
import com.maresi.api.repository.WalletRepository;
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
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class PaymentBusiness {
  private static final Set<Integer> WALLET_TOPUP_AMOUNTS = Set.of(5000, 10000, 25000, 50000);

  private final PaymentRepository payments;
  private final OwnerSubscriptionRepository subscriptions;
  private final VisitRequestRepository visitRequests;
  private final PropertyRepository properties;
  private final WalletRepository wallets;
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
      PropertyRepository properties,
      WalletRepository wallets,
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
    this.properties = properties;
    this.wallets = wallets;
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
    long listings = properties.countByOwner(user.id());
    int left = (int) Math.max(0, PropertyBusiness.FREE_LISTINGS - listings);
    item.put("listings_count", listings);
    item.put("free_listings_left", left);
    item.put("free_listings_limit", PropertyBusiness.FREE_LISTINGS);
    item.put("commission_due", payments.sumPendingAccruedCommission(user.id()));
    item.put("wallet_balance", wallets.balance(user.id()));
    item.put("wallet_ledger", wallets.ledger(user.id(), 12));
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
    Map<String, Object> fromWallet = paySubscriptionFromWallet(user.id(), amount);
    if (fromWallet != null) {
      response.setItem(fromWallet);
      response.setStatus(functionalError.success("Abonnement paye via portefeuille", locale));
      return response;
    }

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
            props.getPayments().getHostSuccessUrl(),
            props.getPayments().getHostErrorUrl(),
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
    response.setHasError(true);
    response.setStatus(
        functionalError.invalidData(
            "Le client paie l'hote via Wave ou Orange Money. GeniusPay n'est plus utilise pour les reservations.",
            locale));
    return response;
  }

  public Response<Map<String, Object>> startCommissionSettlement(Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    if (!"owner".equals(user.role())) {
      response.setHasError(true);
      response.setStatus(functionalError.disallowed("Commission reservee aux hotes", locale));
      return response;
    }
    BigDecimal due = payments.sumPendingAccruedCommission(user.id());
    if (due.compareTo(BigDecimal.ZERO) <= 0) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Aucune commission a regler", locale));
      return response;
    }
    Map<String, Object> fromWallet = settleCommissionFromWallet(user.id(), due);
    if (fromWallet != null) {
      response.setItem(fromWallet);
      response.setStatus(functionalError.success("Commission reglee via portefeuille", locale));
      return response;
    }
    if (due.compareTo(BigDecimal.valueOf(200)) < 0) {
      response.setHasError(true);
      response.setStatus(
          functionalError.invalidData("Rechargez le portefeuille pour regler cette commission", locale));
      return response;
    }

    Map<String, Object> metadata = new HashMap<>();
    metadata.put("type", "commission");
    metadata.put("settlement", true);
    metadata.put("user_id", user.id().toString());

    Map<String, Object> payment =
        payments.create(
            user.id(),
            "commission",
            null,
            due,
            due,
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
            due,
            "Commission Maresi 10%",
            customer,
            props.getPayments().getHostSuccessUrl(),
            props.getPayments().getHostErrorUrl(),
            metadata);

    payment =
        payments.updateCheckout(
            UUID.fromString(payment.get("id").toString()),
            String.valueOf(gp.get("reference")),
            String.valueOf(gp.get("checkout_url")));

    response.setItem(payment);
    response.setStatus(functionalError.success("Checkout commission", locale));
    return response;
  }

  public Response<Map<String, Object>> startWalletTopup(
      Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    if (!"owner".equals(user.role())) {
      response.setHasError(true);
      response.setStatus(functionalError.disallowed("Portefeuille reserve aux hotes", locale));
      return response;
    }
    int amountFcfa = intVal(request.getData() == null ? null : request.getData().get("amount"), 0);
    if (!WALLET_TOPUP_AMOUNTS.contains(amountFcfa)) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Montant: 5000, 10000, 25000 ou 50000", locale));
      return response;
    }
    BigDecimal amount = BigDecimal.valueOf(amountFcfa);
    Map<String, Object> metadata = new HashMap<>();
    metadata.put("type", "wallet_topup");
    metadata.put("user_id", user.id().toString());

    Map<String, Object> payment =
        payments.create(
            user.id(),
            "wallet_topup",
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
            "Recharge portefeuille Maresi",
            customer,
            props.getPayments().getHostSuccessUrl(),
            props.getPayments().getHostErrorUrl(),
            metadata);

    payment =
        payments.updateCheckout(
            UUID.fromString(payment.get("id").toString()),
            String.valueOf(gp.get("reference")),
            String.valueOf(gp.get("checkout_url")));

    response.setItem(payment);
    response.setStatus(functionalError.success("Checkout portefeuille", locale));
    return response;
  }

  public void accrueHostCommission(Map<String, Object> visit) {
    if (visit == null || visit.get("property_owner_id") == null) return;
    UUID ownerId = UUID.fromString(visit.get("property_owner_id").toString());
    UUID visitId = UUID.fromString(visit.get("id").toString());
    BigDecimal amount = computeReservationAmount(visit);
    int percent = props.getPayments().getReservationCommissionPercent();
    BigDecimal commission =
        amount
            .multiply(BigDecimal.valueOf(percent))
            .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    if (commission.compareTo(BigDecimal.ZERO) <= 0) return;
    Map<String, Object> metadata = new HashMap<>();
    metadata.put("type", "commission");
    metadata.put("visit_request_id", visitId.toString());
    metadata.put("commission_percent", percent);
    metadata.put("stay_amount", amount);
    Optional<Map<String, Object>> walletPaid =
        wallets.tryDebit(
            ownerId, commission, "commission", null, visitId, "Commission 10% reservation");
    if (walletPaid.isPresent()) {
      Map<String, Object> paid =
          payments.create(
              ownerId,
              "commission",
              visitId,
              commission,
              commission,
              amount.subtract(commission),
              "XOF",
              "completed",
              "wallet",
              null,
              null,
              metadata);
      notifications.create(
          ownerId,
          "payment",
          "Commission prelevee",
          "10% ont ete debites de votre portefeuille Maresi.",
          null);
      realtime.publish("payment.completed", paid, ownerId, ownerId, true);
      return;
    }
    payments.create(
        ownerId,
        "commission",
        visitId,
        commission,
        commission,
        amount.subtract(commission),
        "XOF",
        "pending",
        null,
        null,
        metadata);
  }

  public Response<Map<String, Object>> confirmByReference(
      Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    Object rawRef = request.getData() == null ? null : request.getData().get("reference");
    String reference = rawRef == null ? null : rawRef.toString().trim();
    if (reference == null || reference.isBlank()) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("reference", locale));
      return response;
    }

    Map<String, Object> payment = payments.findByProviderReference(reference).orElse(null);
    if (payment == null) {
      response.setHasError(true);
      response.setStatus(functionalError.dataNotFound("Paiement introuvable", locale));
      return response;
    }

    if ("completed".equals(String.valueOf(payment.get("status")))) {
      response.setItem(payment);
      response.setStatus(functionalError.success("Paiement deja confirme", locale));
      return response;
    }

    Map<String, Object> remote = geniusPay.getPayment(reference);
    String remoteStatus = remote.get("status") == null ? "" : String.valueOf(remote.get("status"));
    UUID paymentId = UUID.fromString(payment.get("id").toString());

    if (isPaidStatus(remoteStatus)) {
      Optional<Map<String, Object>> completed = payments.markCompleted(paymentId);
      if (completed.isPresent()) {
        applyPaymentSideEffects(completed.get());
        response.setItem(completed.get());
      } else {
        response.setItem(payments.findById(paymentId).orElse(payment));
      }
      response.setStatus(functionalError.success("Paiement confirme", locale));
      return response;
    }
    if (isFailedStatus(remoteStatus)) {
      Map<String, Object> failedPayment = payments.markFailed(paymentId).orElse(payment);
      response.setItem(failedPayment);
      response.setStatus(functionalError.success("Paiement echoue", locale));
      return response;
    }

    response.setItem(payment);
    response.setStatus(functionalError.success("Paiement encore en attente", locale));
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
      boolean refunded =
          normalizedEvent.contains("refund")
              || "refunded".equalsIgnoreCase(text(data, "status"));

      if (refunded) {
        if ("refunded".equals(String.valueOf(payment.get("status")))) {
          response.setItem(payment);
          response.setStatus(functionalError.success("Webhook deja traite", locale));
          return response;
        }
        Map<String, Object> refundedPayment = payments.markRefunded(paymentId).orElse(null);
        if (refundedPayment == null) {
          response.setItem(payment);
          response.setStatus(functionalError.success("Webhook ignore", locale));
          return response;
        }
        applyRefundSideEffects(refundedPayment);
        response.setItem(refundedPayment);
        response.setStatus(functionalError.success("Paiement rembourse", locale));
        return response;
      }
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

    if ("wallet_topup".equals(type)) {
      BigDecimal amount = toMoney(payment.get("amount"));
      if (amount != null && amount.compareTo(BigDecimal.ZERO) > 0) {
        wallets.credit(userId, amount, "topup", paymentId, null, "Recharge GeniusPay");
        settleCommissionFromWallet(userId, payments.sumPendingAccruedCommission(userId));
      }
      notifications.create(
          userId, "payment", "Portefeuille recharge", "Votre portefeuille Maresi a ete credite.", null);
      realtime.publish("payment.completed", payment, userId, userId, true);
      return;
    }

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

    if ("commission".equals(type)) {
      payments.markPendingAccruedCompleted(userId);
      notifications.create(
          userId,
          "payment",
          "Commission reglee",
          "Votre commission Maresi a ete encaissee. Vous pouvez accepter de nouvelles reservations.",
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

  private void applyRefundSideEffects(Map<String, Object> payment) {
    UUID userId = UUID.fromString(payment.get("user_id").toString());
    String type = String.valueOf(payment.get("type"));
    if ("subscription".equals(type)) {
      subscriptions.setInactive(userId);
      if ("wallet".equals(String.valueOf(payment.get("provider")))) {
        creditWalletRefund(userId, payment);
      }
      notifications.create(
          userId, "payment", "Paiement rembourse", "Votre abonnement hote a ete rembourse.", null);
      return;
    }
    if ("reservation".equals(type) && payment.get("visit_request_id") != null) {
      UUID visitId = UUID.fromString(payment.get("visit_request_id").toString());
      visitRequests.updateStatusById(visitId, "awaiting_payment");
      notifications.create(
          userId, "payment", "Paiement rembourse", "Votre reservation a ete remboursee.", null);
      return;
    }
    if ("wallet_topup".equals(type)) {
      clawBackWallet(userId, payment, "Remboursement recharge");
      notifications.create(
          userId, "payment", "Paiement rembourse", "Votre recharge portefeuille a ete remboursee.", null);
      return;
    }
    if ("wallet".equals(String.valueOf(payment.get("provider")))) {
      creditWalletRefund(userId, payment);
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

  private Map<String, Object> paySubscriptionFromWallet(UUID userId, BigDecimal amount) {
    if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) return null;
    Optional<Map<String, Object>> debit =
        wallets.tryDebit(userId, amount, "subscription", null, null, "Abonnement proprietaire");
    if (debit.isEmpty()) return null;
    Map<String, Object> metadata = new HashMap<>();
    metadata.put("type", "subscription");
    metadata.put("user_id", userId.toString());
    metadata.put("via", "wallet");
    Map<String, Object> paid =
        payments.create(
            userId,
            "subscription",
            null,
            amount,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            "XOF",
            "completed",
            "wallet",
            null,
            null,
            metadata);
    applyPaymentSideEffects(paid);
    return paid;
  }

  private Map<String, Object> settleCommissionFromWallet(UUID userId, BigDecimal due) {
    if (due == null || due.compareTo(BigDecimal.ZERO) <= 0) return null;
    Optional<Map<String, Object>> debit =
        wallets.tryDebit(userId, due, "commission", null, null, "Reglement commission");
    if (debit.isEmpty()) return null;
    Map<String, Object> metadata = new HashMap<>();
    metadata.put("type", "commission");
    metadata.put("settlement", true);
    metadata.put("via", "wallet");
    Map<String, Object> paid =
        payments.create(
            userId,
            "commission",
            null,
            due,
            due,
            BigDecimal.ZERO,
            "XOF",
            "completed",
            "wallet",
            null,
            null,
            metadata);
    payments.markPendingAccruedCompleted(userId);
    notifications.create(
        userId,
        "payment",
        "Commission reglee",
        "Votre commission Maresi a ete prelevee sur le portefeuille.",
        null);
    realtime.publish("payment.completed", paid, userId, userId, true);
    return paid;
  }

  private void clawBackWallet(UUID userId, Map<String, Object> payment, String note) {
    BigDecimal amount = toMoney(payment.get("amount"));
    if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) return;
    BigDecimal take = amount.min(wallets.balance(userId));
    if (take.compareTo(BigDecimal.ZERO) <= 0) return;
    UUID paymentId = uuid(payment.get("id"));
    wallets.tryDebit(userId, take, "topup", paymentId, null, note);
  }

  private void creditWalletRefund(UUID userId, Map<String, Object> payment) {
    BigDecimal amount = toMoney(payment.get("amount"));
    if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) return;
    String type = String.valueOf(payment.get("type"));
    String entry = "commission".equals(type) ? "commission" : "subscription";
    wallets.credit(userId, amount, entry, uuid(payment.get("id")), null, "Remboursement");
  }

  private static int intVal(Object v, int fallback) {
    if (v == null) return fallback;
    if (v instanceof Number n) return n.intValue();
    try {
      return Integer.parseInt(v.toString().trim().replace(" ", ""));
    } catch (Exception e) {
      return fallback;
    }
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

  private static boolean sameId(Object a, Object b) {
    if (a == null || b == null) return false;
    return a.toString().equalsIgnoreCase(b.toString());
  }

  private static boolean isPaidStatus(String status) {
    if (status == null || status.isBlank()) return false;
    String s = status.toLowerCase(Locale.ROOT);
    return s.contains("complet") || "paid".equals(s) || "success".equals(s) || "succeeded".equals(s);
  }

  private static boolean isFailedStatus(String status) {
    if (status == null || status.isBlank()) return false;
    String s = status.toLowerCase(Locale.ROOT);
    return s.contains("fail") || s.contains("expir") || s.contains("cancel");
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
