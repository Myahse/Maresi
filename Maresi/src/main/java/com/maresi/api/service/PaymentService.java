package com.maresi.api.service;

import com.maresi.api.business.PaymentBusiness;
import com.maresi.api.contracts.Request;
import com.maresi.api.contracts.Response;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class PaymentService {
  private final PaymentBusiness paymentBusiness;

  public PaymentService(PaymentBusiness paymentBusiness) {
    this.paymentBusiness = paymentBusiness;
  }

  public Response<Map<String, Object>> getMySubscription(Locale locale) {
    return paymentBusiness.getMySubscription(locale);
  }

  public Response<Map<String, Object>> listMyPayments(Locale locale) {
    return paymentBusiness.listMyPayments(locale);
  }

  public Response<Map<String, Object>> startSubscription(Locale locale) {
    return paymentBusiness.startSubscription(locale);
  }

  public Response<Map<String, Object>> startReservationPayment(
      Request<Map<String, Object>> request, Locale locale) {
    return paymentBusiness.startReservationPayment(request, locale);
  }

  public Response<Map<String, Object>> startCommissionSettlement(Locale locale) {
    return paymentBusiness.startCommissionSettlement(locale);
  }

  public Response<Map<String, Object>> startWalletTopup(
      Request<Map<String, Object>> request, Locale locale) {
    return paymentBusiness.startWalletTopup(request, locale);
  }

  public Response<Map<String, Object>> confirmByReference(
      Request<Map<String, Object>> request, Locale locale) {
    return paymentBusiness.confirmByReference(request, locale);
  }

  public Response<Map<String, Object>> handleWebhook(
      String rawBody, String signature, String timestamp, String event, Locale locale) {
    return paymentBusiness.handleWebhook(rawBody, signature, timestamp, event, locale);
  }
}
