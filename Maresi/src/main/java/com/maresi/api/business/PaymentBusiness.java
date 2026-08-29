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
    try {
      item.put("wallet_balance", wallets.balance(user.id()));
      item.put("wallet_ledger", wallets.ledger(user.id(), 12));
    } catch (Exception e) {
      item.put("wallet_balance", BigDecimal.ZERO);
      item.put("wallet_ledger", List.of());
    }
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
    AuthUser user = SecurityUtils.requireUser();
    Map<String, Object> body = request.getData() == null ? Map.of() : request.getData();
    UUID visitId = uuid(body.get("visitRequestId"));
    if (visitId == null) visitId = uuid(body.get("visit_request_id"));
    if (visitId == null) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("visitRequestId", locale));
      return response;
    }
    Map<String, Object> visit = visitRequests.findById(visitId).orElse(null);
    if (visit == null) {
      response.setHasError(true);
      response.setStatus(functionalError.dataNotFound("Reservation introuvable", locale));
      return response;
    }
    if (!sameId(visit.get("user_id"), user.id())) {
      response.setHasError(true);
      response.setStatus(functionalError.disallowed("Action non autorisee", locale));
      return response;
    }
    if (!"awaiting_payment".equals(String.valueOf(visit.get("status")))) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Cette reservation n'attend pas de paiement", locale));
      return response;
    }
    BigDecimal amount = computeReservationAmount(visit);
    if (amount.compareTo(BigDecimal.valueOf(200)) < 0) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Montant minimum 200 XOF", locale));
      return response;
    }
    Map<String, Object> metadata = new HashMap<>();
    metadata.put("type", "reservation");
    metadata.put("user_id", user.id().toString());
    metadata.put("visit_request_id", visitId.toString());
    Map<String, Object> payment =
        payments.create(
            user.id(),
            "reservation",
            visitId,
            amount,
            BigDecimal.ZERO,
            amount,
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
            "Reservation Maresi",
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

  public Response<Map<String, Object>> startPayout(
      Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    AuthUser user = SecurityUtils.requireUser();
    if (!"owner".equals(user.role())) {
      response.setHasError(true);
      response.setStatus(functionalError.disallowed("Retrait reserve aux hotes", locale));
      return response;
    }
    Map<String, Object> body = request.getData() == null ? Map.of() : request.getData();
    BigDecimal amount = toMoney(body.get("amount"));
    if (amount == null) amount = BigDecimal.valueOf(intVal(body.get("amount"), 0));
    amount = amount.setScale(2, RoundingMode.HALF_UP);
    if (amount.compareTo(BigDecimal.valueOf(200)) < 0) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Retrait minimum 200 XOF", locale));
      return response;
    }
    String provider = str(body.get("provider"));
    if (provider == null || !Set.of("wave", "orange_money").contains(provider)) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Destination: wave ou orange_money", locale));
      return response;
    }
    String phone = normalizeCiPhone(str(body.get("phone")));
    if (phone == null) {
      Map<String, Object> dbUser = users.findById(user.id()).orElse(null);
      phone = dbUser == null ? null : normalizeCiPhone(str(dbUser.get("phone")));
    }
    if (phone == null) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("phone", locale));
      return response;
    }
    Optional<Map<String, Object>> debit =
        wallets.tryDebit(user.id(), amount, "payout", null, null, "Retrait " + provider);
    if (debit.isEmpty()) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Solde portefeuille insuffisant", locale));
      return response;
    }
    Map<String, Object> metadata = new HashMap<>();
    metadata.put("type", "payout");
    metadata.put("user_id", user.id().toString());
    metadata.put("provider", provider);
    metadata.put("phone", phone);
    Map<String, Object> payment =
        payments.create(
            user.id(),
            "payout",
            null,
            amount,
            BigDecimal.ZERO,
            amount,
            "XOF",
            "pending",
            "geniuspay",
            null,
            null,
            metadata);
    metadata.put("payment_id", payment.get("id").toString());
    try {
      String name =
          users.findById(user.id()).map(u -> str(u.get("full_name"))).orElse(user.email());
      Map<String, Object> gp =
          geniusPay.createPayout(
              amount,
              name,
              phone,
              provider,
              "Retrait portefeuille Maresi",
              payment.get("id").toString(),
              metadata);
      payment =
          payments.updateCheckout(
              UUID.fromString(payment.get("id").toString()),
              String.valueOf(gp.get("reference")),
              null);
      String gpStatus = str(gp.get("status"));
      if (isPaidStatus(gpStatus)) {
        payment = payments.markCompleted(UUID.fromString(payment.get("id").toString())).orElse(payment);
        applyPaymentSideEffects(payment);
      } else if (isFailedStatus(gpStatus)) {
        wallets.credit(user.id(), amount, "payout", uuid(payment.get("id")), null, "Retrait echoue, solde recrédité");
        payment = payments.markFailed(UUID.fromString(payment.get("id").toString())).orElse(payment);
        response.setHasError(true);
        response.setItem(payment);
        response.setStatus(functionalError.invalidData("Le retrait n'a pas abouti", locale));
        return response;
      }
    } catch (RuntimeException e) {
      wallets.credit(user.id(), amount, "payout", uuid(payment.get("id")), null, "Retrait echoue, solde recrédité");
      payments.markFailed(UUID.fromString(payment.get("id").toString()));
      throw e;
    }
    response.setItem(payment);
    response.setStatus(functionalError.success("Retrait initie", locale));
    return response;
  }

  private static String str(Object v) {
    if (v == null) return null;
    String s = v.toString().trim();
    return s.isEmpty() ? null : s;
  }

  private static String normalizeCiPhone(String raw) {
    if (raw == null) return null;
    String compact = raw.replaceAll("[\\s.-]", "");
    if (compact.isEmpty()) return null;
    if (compact.startsWith("+")) return compact;
    if (compact.startsWith("225")) return "+" + compact;
    if (compact.startsWith("00225")) return "+" + compact.substring(2);
    return "+225" + compact.replaceFirst("^0", "");
  }

  public void accrueHostCommission(Map<String, Object> visit) {
    // Stays are paid in full to the host wallet. No reservation commission.
  }

  /**
   * Refund a paid stay when the guest cancels. Host wallet is taken first so we only
   * refund if they have not already withdrawn.
   *
   * @return error message, or null if there was nothing to refund / refund succeeded
   */
  public String refundPaidStayOnCancel(Map<String, Object> visit) {
    if (visit == null || visit.get("id") == null) return null;
    UUID visitId = UUID.fromString(visit.get("id").toString());
    payments.abandonPendingReservations(visitId);
    Map<String, Object> payment = payments.findCompletedReservation(visitId).orElse(null);
    if (payment == null) return null;

    BigDecimal amount = toMoney(payment.get("amount"));
    if (amount == null) amount = toMoney(payment.get("owner_amount"));
    UUID paymentId = uuid(payment.get("id"));
    UUID ownerId =
        visit.get("property_owner_id") == null
            ? null
            : UUID.fromString(visit.get("property_owner_id").toString());

    if (ownerId != null && amount != null && amount.compareTo(BigDecimal.ZERO) > 0) {
      Optional<Map<String, Object>> debit =
          wallets.tryDebit(
              ownerId, amount, "stay", paymentId, visitId, "Annulation client");
      if (debit.isEmpty()) {
        return "L'hote a deja retire. Un remboursement automatique n'est plus possible. Contactez le support.";
      }
    }

    String reference =
        payment.get("provider_reference") == null
            ? null
            : String.valueOf(payment.get("provider_reference"));
    if (reference != null && !reference.isBlank() && !geniusPay.refundPayment(reference)) {
      if (ownerId != null && amount != null && amount.compareTo(BigDecimal.ZERO) > 0) {
        wallets.credit(
            ownerId, amount, "stay", paymentId, visitId, "Annulation echouee, solde recrédité");
      }
      return "Le remboursement GeniusPay a echoue. Reessayez dans un instant.";
    }

    payments.markRefunded(paymentId);
    UUID guestId = uuid(payment.get("user_id"));
    UUID propertyId =
        visit.get("property_id") == null ? null : UUID.fromString(visit.get("property_id").toString());
    if (guestId != null) {
      notifications.create(
          guestId,
          "payment",
          "Reservation remboursee",
          "Votre paiement a ete rembourse suite a l'annulation.",
          propertyId);
    }
    if (ownerId != null) {
      notifications.create(
          ownerId,
          "reservation",
          "Reservation annulee",
          "Le client a annule. Le montant a ete retire de votre portefeuille.",
          propertyId);
    }
    return null;
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
      if ("failed".equals(String.valueOf(payment.get("status")))) {
        response.setItem(payment);
        response.setStatus(functionalError.success("Paiement deja echoue", locale));
        return response;
      }
      Map<String, Object> failedPayment = payments.markFailed(paymentId).orElse(payment);
      applyFailedSideEffects(failedPayment);
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
      if (event == null || event.isBlank()) {
        event = text(root, "event");
      }
      JsonNode data = root.has("data") ? root.get("data") : root;
      JsonNode payoutNode = data.has("payout") ? data.get("payout") : data;
      String reference = text(payoutNode, "reference", "id", "transaction_id");
      if (reference == null) reference = text(data, "reference", "id", "transaction_id");
      String paymentIdFromMeta = null;
      JsonNode meta = data.get("metadata");
      if (meta == null && payoutNode != null) meta = payoutNode.get("metadata");
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
              || isPaidStatus(text(data, "status"))
              || isPaidStatus(text(payoutNode, "status"));
      boolean failed =
          normalizedEvent.contains("fail")
              || normalizedEvent.contains("expired")
              || isFailedStatus(text(data, "status"))
              || isFailedStatus(text(payoutNode, "status"));
      boolean refunded =
          normalizedEvent.contains("refund")
              || "refunded".equalsIgnoreCase(text(data, "status"))
              || "refunded".equalsIgnoreCase(text(payoutNode, "status"));

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
        if ("failed".equals(String.valueOf(payment.get("status")))) {
          response.setItem(payment);
          response.setStatus(functionalError.success("Webhook deja traite", locale));
          return response;
        }
        Map<String, Object> failedPayment = payments.markFailed(paymentId).orElse(null);
        if (failedPayment == null) {
          response.setItem(payment);
          response.setStatus(functionalError.success("Webhook ignore", locale));
          return response;
        }
        applyFailedSideEffects(failedPayment);
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

    if ("payout".equals(type)) {
      notifications.create(
          userId, "payment", "Retrait envoye", "Votre retrait a ete envoye sur Wave ou Orange Money.", null);
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
        BigDecimal stayAmount = toMoney(payment.get("amount"));
        if (stayAmount == null) stayAmount = toMoney(payment.get("owner_amount"));
        if (stayAmount != null && stayAmount.compareTo(BigDecimal.ZERO) > 0) {
          wallets.credit(
              ownerId,
              stayAmount,
              "stay",
              paymentId,
              visitId,
              "Sejour paye par le client");
        }
        notifications.create(
            ownerId,
            "payment",
            "Paiement recu",
            "Le client a paye. "
                + (stayAmount == null ? "" : stayAmount + " XOF")
                + " ont ete ajoutes a votre portefeuille.",
            propertyId);
      }
      realtime.publish("payment.completed", payment, userId, ownerId, true);
    }
  }

  private void applyFailedSideEffects(Map<String, Object> payment) {
    if (payment == null) return;
    if (!"payout".equals(String.valueOf(payment.get("type")))) return;
    UUID userId = UUID.fromString(payment.get("user_id").toString());
    BigDecimal amount = toMoney(payment.get("amount"));
    if (amount != null && amount.compareTo(BigDecimal.ZERO) > 0) {
      wallets.credit(userId, amount, "payout", uuid(payment.get("id")), null, "Retrait echoue, solde recrédité");
    }
    notifications.create(
        userId, "payment", "Retrait echoue", "Le retrait n'a pas abouti. Le solde a ete recrédité.", null);
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
      visitRequests.updateStatusById(visitId, "cancelled");
      Map<String, Object> visit = visitRequests.findById(visitId).orElse(null);
      if (visit != null && visit.get("property_owner_id") != null) {
        BigDecimal take = toMoney(payment.get("amount"));
        if (take == null) take = toMoney(payment.get("owner_amount"));
        if (take != null && take.compareTo(BigDecimal.ZERO) > 0) {
          UUID ownerId = UUID.fromString(visit.get("property_owner_id").toString());
          BigDecimal available = take.min(wallets.balance(ownerId));
          if (available.compareTo(BigDecimal.ZERO) > 0) {
            wallets.tryDebit(ownerId, available, "stay", uuid(payment.get("id")), visitId, "Remboursement sejour");
          }
        }
      }
      notifications.create(
          userId, "payment", "Paiement rembourse", "Votre reservation a ete remboursee.", null);
      return;
    }
    if ("payout".equals(type)) {
      BigDecimal amount = toMoney(payment.get("amount"));
      if (amount != null && amount.compareTo(BigDecimal.ZERO) > 0) {
        wallets.credit(userId, amount, "payout", uuid(payment.get("id")), null, "Retrait rembourse");
      }
      notifications.create(
          userId, "payment", "Retrait rembourse", "Le montant du retrait a ete recrédité.", null);
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
