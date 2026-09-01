package com.maresi.api.business;

import com.maresi.api.config.AppProperties;
import com.maresi.api.contracts.FunctionalError;
import com.maresi.api.contracts.Request;
import com.maresi.api.contracts.Response;
import com.maresi.api.exception.ApiException;
import com.maresi.api.repository.ActivityRepository;
import com.maresi.api.repository.AdminMonitorRepository;
import com.maresi.api.repository.NotificationRepository;
import com.maresi.api.repository.OwnerSubscriptionRepository;
import com.maresi.api.repository.PaymentRepository;
import com.maresi.api.repository.UserRepository;
import com.maresi.api.repository.VisitRequestRepository;
import com.maresi.api.repository.WalletRepository;
import com.maresi.api.repository.AppSettingsRepository;
import com.maresi.api.security.AuthUser;
import com.maresi.api.security.SecurityUtils;
import com.maresi.api.service.EmailService;
import com.maresi.api.service.EmailTemplates;
import com.maresi.api.service.GeniusPayClient;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class AdminMonitorBusiness {
  private final AdminMonitorRepository monitor;
  private final ActivityRepository activity;
  private final OwnerSubscriptionRepository subscriptions;
  private final PaymentRepository payments;
  private final VisitRequestRepository visitRequests;
  private final NotificationRepository notifications;
  private final UserRepository users;
  private final WalletRepository wallets;
  private final GeniusPayClient geniusPay;
  private final EmailService email;
  private final AppProperties props;
  private final FunctionalError functionalError;
  private final HostStatus hostStatus;
  private final AppSettingsRepository settings;
  private final PaymentBusiness paymentBusiness;

  public AdminMonitorBusiness(
      AdminMonitorRepository monitor,
      ActivityRepository activity,
      OwnerSubscriptionRepository subscriptions,
      PaymentRepository payments,
      VisitRequestRepository visitRequests,
      NotificationRepository notifications,
      UserRepository users,
      WalletRepository wallets,
      GeniusPayClient geniusPay,
      EmailService email,
      AppProperties props,
      FunctionalError functionalError,
      HostStatus hostStatus,
      AppSettingsRepository settings,
      PaymentBusiness paymentBusiness) {
    this.monitor = monitor;
    this.activity = activity;
    this.subscriptions = subscriptions;
    this.payments = payments;
    this.visitRequests = visitRequests;
    this.notifications = notifications;
    this.users = users;
    this.wallets = wallets;
    this.geniusPay = geniusPay;
    this.email = email;
    this.props = props;
    this.functionalError = functionalError;
    this.hostStatus = hostStatus;
    this.settings = settings;
    this.paymentBusiness = paymentBusiness;
  }

  public Response<Map<String, Object>> getSettings(Locale locale) {
    requireAdmin();
    Response<Map<String, Object>> response = new Response<>();
    response.setItem(
        Map.of(
            "client_pays_operator_fees",
            settings.clientPaysOperatorFees(),
            "operator_fee_percent",
            settings.operatorFeePercent()));
    response.setStatus(functionalError.success("Reglages", locale));
    return response;
  }

  public Response<Map<String, Object>> updateSettings(
      Request<Map<String, Object>> request, Locale locale) {
    requireAdmin();
    Map<String, Object> body = request.getData() == null ? Map.of() : request.getData();
    if (body.containsKey("client_pays_operator_fees")) {
      settings.put(
          AppSettingsRepository.CLIENT_PAYS_OPERATOR_FEES,
          boolVal(body.get("client_pays_operator_fees"), false) ? "true" : "false");
    }
    if (body.containsKey("operator_fee_percent")) {
      settings.put(
          AppSettingsRepository.OPERATOR_FEE_PERCENT,
          String.valueOf(body.get("operator_fee_percent")));
    }
    return getSettings(locale);
  }

  public Response<Map<String, Object>> overview(Locale locale) {
    requireAdmin();
    Response<Map<String, Object>> response = new Response<>();
    response.setItem(monitor.overview());
    response.setStatus(functionalError.success("Vue admin", locale));
    return response;
  }

  public Response<Map<String, Object>> users(Locale locale) {
    requireAdmin();
    return list(monitor.listUsers(), "Utilisateurs", locale);
  }

  public Response<Map<String, Object>> payments(Locale locale) {
    requireAdmin();
    return list(monitor.listPayments(), "Paiements", locale);
  }

  public Response<Map<String, Object>> subscriptions(Locale locale) {
    requireAdmin();
    return list(monitor.listSubscriptions(), "Abonnements", locale);
  }

  public Response<Map<String, Object>> visits(Locale locale) {
    requireAdmin();
    return list(monitor.listVisits(), "Reservations", locale);
  }

  public Response<Map<String, Object>> cancelVisit(
      UUID id, Request<Map<String, Object>> request, Locale locale) {
    requireAdmin();
    Response<Map<String, Object>> response = new Response<>();
    Map<String, Object> visit = visitRequests.findById(id).orElse(null);
    if (visit == null) {
      response.setHasError(true);
      response.setStatus(functionalError.dataNotFound("Reservation introuvable", locale));
      return response;
    }
    String action = request.getData() == null ? null : str(request.getData().get("action"));
    if (!"cancel".equals(action)) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("action: cancel", locale));
      return response;
    }
    String status = String.valueOf(visit.get("status"));
    if ("cancelled".equals(status) || "declined".equals(status)) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Cette reservation est deja close", locale));
      return response;
    }
    if ("confirmed".equals(status) || "payment_sent".equals(status)) {
      String refundError = paymentBusiness.refundPaidStayOnCancel(visit);
      if (refundError != null) {
        response.setHasError(true);
        response.setStatus(functionalError.invalidData(refundError, locale));
        return response;
      }
    } else {
      payments.abandonPendingReservations(id);
    }
    Map<String, Object> updated = visitRequests.updateStatusById(id, "cancelled").orElse(visit);
    UUID guestId = UUID.fromString(updated.get("user_id").toString());
    UUID listingId =
        updated.get("property_id") == null
            ? null
            : UUID.fromString(updated.get("property_id").toString());
    notifications.create(
        guestId,
        "reservation",
        "Reservation annulee",
        "Un administrateur a annule cette reservation.",
        listingId);
    if (updated.get("property_owner_id") != null) {
      notifications.create(
          UUID.fromString(updated.get("property_owner_id").toString()),
          "reservation",
          "Reservation annulee",
          "Un administrateur a annule cette reservation.",
          listingId);
    }
    response.setItem(updated);
    response.setStatus(functionalError.success("Reservation annulee par l'admin", locale));
    return response;
  }

  public Response<Map<String, Object>> activity(Locale locale) {
    requireAdmin();
    return list(activity.listRecent(250), "Activite", locale);
  }

  public Response<Map<String, Object>> userTrail(UUID userId, Locale locale) {
    requireAdmin();
    Response<Map<String, Object>> response = new Response<>();
    Map<String, Object> account = users.findIdentity(userId).orElse(null);
    if (account == null) {
      response.setHasError(true);
      response.setStatus(functionalError.dataNotFound("Utilisateur introuvable", locale));
      return response;
    }
    UserBusiness.exposeIdentityLinks(account, userId);
    Map<String, Object> item = new java.util.LinkedHashMap<>();
    item.put("user", account);
    item.put("visits", visitRequests.findByUserOrOwner(userId));
    item.put("payments", monitor.listPaymentsForUser(userId));
    item.put("activity", activity.listForUser(userId, 150));
    response.setItem(item);
    response.setStatus(functionalError.success("Dossier utilisateur", locale));
    return response;
  }

  public Response<Map<String, Object>> reviewUser(
      UUID userId, Request<Map<String, Object>> request, Locale locale) {
    AuthUser admin = requireAdmin();
    Response<Map<String, Object>> response = new Response<>();
    Map<String, Object> account = users.findIdentity(userId).orElse(null);
    if (account == null) {
      response.setHasError(true);
      response.setStatus(functionalError.dataNotFound("Utilisateur introuvable", locale));
      return response;
    }
    if ("admin".equals(String.valueOf(account.get("role")))) {
      response.setHasError(true);
      response.setStatus(functionalError.disallowed("Impossible de modifier un compte admin", locale));
      return response;
    }
    Map<String, Object> body = request.getData() != null ? request.getData() : Map.of();
    String action = str(body.get("action"));
    if ("unsuspend".equals(action)) {
      users.unsuspend(userId);
      notifications.create(
          userId,
          "account",
          "Compte retabli",
          "Un administrateur a retabli votre compte. Vous pouvez a nouveau reserver.",
          null);
      activity.record(
          "user.unsuspend",
          "user",
          userId,
          admin.id(),
          "Compte retabli",
          Map.of());
      Map<String, Object> updated = users.findIdentity(userId).orElse(account);
      UserBusiness.exposeIdentityLinks(updated, userId);
      response.setItem(updated);
      response.setStatus(functionalError.success("Compte retabli", locale));
      return response;
    }
    if (!"request_correction".equals(action)) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("action: request_correction ou unsuspend", locale));
      return response;
    }
    String message = str(body.get("message"));
    if (message == null || message.length() < 8) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("message", locale));
      return response;
    }
    boolean suspend = boolVal(body.get("suspend"), true);
    users.requestCorrection(userId, message, suspend);
    hostStatus.attach(account);
    String cta =
        hostStatus.isHostTrack(account)
            ? EmailTemplates.hostApp(props) + "/owner/account"
            : EmailTemplates.guestApp(props) + "/account";
    email.sendToUser(
        userId,
        EmailTemplates.identityCorrection(EmailTemplates.personName(account), message, suspend, cta));
    notifications.create(
        userId,
        "account",
        suspend ? "Compte suspendu — correction demandee" : "Correction demandee",
        message,
        null);
    activity.record(
        "user.review",
        "user",
        userId,
        admin.id(),
        suspend ? "Correction demandee et compte suspendu" : "Correction demandee",
        Map.of("suspend", suspend, "message", message));
    Map<String, Object> updated = users.findIdentity(userId).orElse(account);
    UserBusiness.exposeIdentityLinks(updated, userId);
    response.setItem(updated);
    response.setStatus(functionalError.success("Demande envoyee", locale));
    return response;
  }

  public Response<Map<String, Object>> updateSubscription(
      UUID userId, Request<Map<String, Object>> request, Locale locale) {
    requireAdmin();
    Response<Map<String, Object>> response = new Response<>();
    Map<String, Object> account = users.findById(userId).orElse(null);
    if (account == null || !"owner".equals(String.valueOf(account.get("role")))) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Abonnement reserve aux hotes", locale));
      return response;
    }
    Map<String, Object> body = request.getData();
    String status = str(body.get("status"));
    int days = intVal(body.get("days"), 30);
    if (days < 1) days = 30;

    Map<String, Object> updated;
    if ("inactive".equals(status) || "expired".equals(status)) {
      updated = subscriptions.setInactive(userId);
      notifications.create(
          userId, "payment", "Abonnement desactive", "Un administrateur a desactive votre abonnement hote.", null);
    } else if ("active".equals(status) || "extend".equals(status)) {
      Instant start = Instant.now();
      Instant end = start.plus(days, ChronoUnit.DAYS);
      if ("extend".equals(status)) {
        Map<String, Object> current = subscriptions.findByUser(userId).orElse(null);
        if (current != null && current.get("expires_at") != null) {
          try {
            Instant existing = Instant.parse(String.valueOf(current.get("expires_at")));
            if (existing.isAfter(start)) start = Instant.parse(String.valueOf(current.get("starts_at")));
            end = (existing.isAfter(Instant.now()) ? existing : Instant.now()).plus(days, ChronoUnit.DAYS);
          } catch (Exception ignored) {
          }
        }
      }
      updated = subscriptions.upsertActive(userId, start, end, null);
      notifications.create(
          userId,
          "payment",
          "Abonnement mis a jour",
          "Un administrateur a active ou prolonge votre abonnement hote.",
          null);
    } else {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("status: active, extend ou inactive", locale));
      return response;
    }
    response.setItem(updated);
    response.setStatus(functionalError.success("Abonnement mis a jour", locale));
    return response;
  }

  public Response<Map<String, Object>> updatePayment(
      UUID id, Request<Map<String, Object>> request, Locale locale) {
    requireAdmin();
    Response<Map<String, Object>> response = new Response<>();
    Map<String, Object> payment = payments.findById(id).orElse(null);
    if (payment == null) {
      response.setHasError(true);
      response.setStatus(functionalError.dataNotFound("Paiement introuvable", locale));
      return response;
    }
    String action = str(request.getData().get("action"));
    String current = String.valueOf(payment.get("status"));
    if ("cancel".equals(action)) {
      if (!"pending".equals(current) && !"processing".equals(current)) {
        response.setHasError(true);
        response.setStatus(functionalError.invalidData("Seul un paiement en attente peut etre annule", locale));
        return response;
      }
      Map<String, Object> failed = payments.markFailed(id).orElse(payment);
      response.setItem(failed);
      response.setStatus(functionalError.success("Paiement annule", locale));
      return response;
    }
    if ("refund".equals(action)) {
      if (!"completed".equals(current)) {
        response.setHasError(true);
        response.setStatus(functionalError.invalidData("Seul un paiement complete peut etre rembourse", locale));
        return response;
      }
      String reference =
          payment.get("provider_reference") == null ? null : String.valueOf(payment.get("provider_reference"));
      boolean providerOk = geniusPay.refundPayment(reference, stayOwnerShare(payment));
      Map<String, Object> refunded = payments.markRefunded(id).orElse(payment);
      applyRefundSideEffects(refunded);
      response.setItem(refunded);
      response.setStatus(
          functionalError.success(
              providerOk
                  ? "Remboursement enregistre"
                  : "Remboursement local enregistre. Verifiez aussi GeniusPay.",
              locale));
      return response;
    }
    response.setHasError(true);
    response.setStatus(functionalError.invalidData("action: cancel ou refund", locale));
    return response;
  }

  private void applyRefundSideEffects(Map<String, Object> payment) {
    UUID userId = UUID.fromString(payment.get("user_id").toString());
    String type = String.valueOf(payment.get("type"));
    if ("subscription".equals(type)) {
      subscriptions.setInactive(userId);
      if ("wallet".equals(String.valueOf(payment.get("provider")))) {
        BigDecimal amount = toMoney(payment.get("amount"));
        if (amount != null && amount.compareTo(BigDecimal.ZERO) > 0) {
          wallets.credit(userId, amount, "subscription", idOf(payment), null, "Remboursement");
        }
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
        BigDecimal take = stayOwnerShare(payment);
        if (take != null && take.compareTo(BigDecimal.ZERO) > 0) {
          UUID ownerId = UUID.fromString(visit.get("property_owner_id").toString());
          BigDecimal available = take.min(wallets.balance(ownerId));
          if (available.compareTo(BigDecimal.ZERO) > 0) {
            wallets.tryDebit(ownerId, available, "stay", idOf(payment), visitId, "Remboursement sejour");
          }
        }
      }
      notifications.create(
          userId, "payment", "Paiement rembourse", "Votre reservation a ete remboursee.", null);
      return;
    }
    if ("wallet_topup".equals(type)) {
      BigDecimal amount = toMoney(payment.get("amount"));
      if (amount != null && amount.compareTo(BigDecimal.ZERO) > 0) {
        BigDecimal take = amount.min(wallets.balance(userId));
        if (take.compareTo(BigDecimal.ZERO) > 0) {
          wallets.tryDebit(userId, take, "topup", idOf(payment), null, "Remboursement recharge");
        }
      }
      notifications.create(
          userId, "payment", "Paiement rembourse", "Votre recharge portefeuille a ete remboursee.", null);
      return;
    }
    if ("wallet".equals(String.valueOf(payment.get("provider")))) {
      BigDecimal amount = toMoney(payment.get("amount"));
      if (amount != null && amount.compareTo(BigDecimal.ZERO) > 0) {
        String entry = "commission".equals(type) ? "commission" : "subscription";
        wallets.credit(userId, amount, entry, idOf(payment), null, "Remboursement");
      }
    }
  }

  private static UUID idOf(Map<String, Object> payment) {
    Object id = payment.get("id");
    if (id == null) return null;
    try {
      return UUID.fromString(id.toString());
    } catch (Exception e) {
      return null;
    }
  }

  private static BigDecimal stayOwnerShare(Map<String, Object> payment) {
    BigDecimal owner = toMoney(payment.get("owner_amount"));
    if (owner != null && owner.compareTo(BigDecimal.ZERO) > 0) return owner;
    BigDecimal amount = toMoney(payment.get("amount"));
    BigDecimal commission = toMoney(payment.get("commission_amount"));
    if (amount != null && commission != null) return amount.subtract(commission).max(BigDecimal.ZERO);
    return amount;
  }

  private static BigDecimal toMoney(Object v) {
    if (v == null) return null;
    if (v instanceof BigDecimal bd) return bd;
    if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
    return new BigDecimal(v.toString());
  }

  private Response<Map<String, Object>> list(List<Map<String, Object>> items, String label, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    response.setItems(items);
    response.setCount((long) items.size());
    response.setStatus(functionalError.success(label, locale));
    return response;
  }

  private AuthUser requireAdmin() {
    AuthUser user = SecurityUtils.requireUser();
    if (!"admin".equals(user.role())) {
      throw ApiException.of(403, "Admin required");
    }
    return user;
  }

  private static String str(Object v) {
    return v == null ? null : v.toString().trim();
  }

  private static int intVal(Object v, int fallback) {
    if (v == null) return fallback;
    try {
      return Integer.parseInt(v.toString());
    } catch (Exception e) {
      return fallback;
    }
  }

  private static boolean boolVal(Object v, boolean fallback) {
    if (v == null) return fallback;
    if (v instanceof Boolean b) return b;
    String s = v.toString().trim().toLowerCase();
    if ("true".equals(s) || "1".equals(s) || "yes".equals(s)) return true;
    if ("false".equals(s) || "0".equals(s) || "no".equals(s)) return false;
    return fallback;
  }
}
