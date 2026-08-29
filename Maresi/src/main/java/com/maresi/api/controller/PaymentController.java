package com.maresi.api.controller;

import com.maresi.api.contracts.ControllerSupport;
import com.maresi.api.contracts.ExceptionUtils;
import com.maresi.api.contracts.FunctionalError;
import com.maresi.api.contracts.Request;
import com.maresi.api.contracts.Response;
import com.maresi.api.contracts.Validate;
import com.maresi.api.service.PaymentService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
@Tag(name = "Payments", description = "Paiements Genius Pay")
@SecurityRequirement(name = "bearerAuth")
public class PaymentController {
  private final PaymentService paymentService;
  private final FunctionalError functionalError;
  private final ExceptionUtils exceptionUtils;

  public PaymentController(
      PaymentService paymentService, FunctionalError functionalError, ExceptionUtils exceptionUtils) {
    this.paymentService = paymentService;
    this.functionalError = functionalError;
    this.exceptionUtils = exceptionUtils;
  }

  @GetMapping("/me")
  public ResponseEntity<Response<Map<String, Object>>> listMine(Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(() -> paymentService.listMyPayments(loc), loc, exceptionUtils);
  }

  @PostMapping("/subscription")
  public ResponseEntity<Response<Map<String, Object>>> startSubscription(Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.runCreated(
        () -> paymentService.startSubscription(loc), loc, exceptionUtils);
  }

  @PostMapping("/commission")
  public ResponseEntity<Response<Map<String, Object>>> startCommission(Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.runCreated(
        () -> paymentService.startCommissionSettlement(loc), loc, exceptionUtils);
  }

  @PostMapping("/payout")
  public ResponseEntity<Response<Map<String, Object>>> startPayout(
      @RequestBody Request<Map<String, Object>> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.runCreated(
        () -> {
          Response<Map<String, Object>> response = new Response<>();
          Validate.validateObject(request, response, functionalError, loc);
          if (response.isHasError()) return response;
          return paymentService.startPayout(request, loc);
        },
        loc,
        exceptionUtils);
  }

  @PostMapping("/wallet-topup")
  public ResponseEntity<Response<Map<String, Object>>> startWalletTopup(
      @RequestBody Request<Map<String, Object>> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.runCreated(
        () -> {
          Response<Map<String, Object>> response = new Response<>();
          Validate.validateObject(request, response, functionalError, loc);
          if (response.isHasError()) return response;
          return paymentService.startWalletTopup(request, loc);
        },
        loc,
        exceptionUtils);
  }

  @PostMapping("/reservation")
  public ResponseEntity<Response<Map<String, Object>>> startReservation(
      @RequestBody Request<Map<String, Object>> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.runCreated(
        () -> {
          Response<Map<String, Object>> response = new Response<>();
          Validate.validateObject(request, response, functionalError, loc);
          if (response.isHasError()) return response;
          return paymentService.startReservationPayment(request, loc);
        },
        loc,
        exceptionUtils);
  }

  @PostMapping("/confirm")
  public ResponseEntity<Response<Map<String, Object>>> confirm(
      @RequestBody Request<Map<String, Object>> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(
        () -> {
          Response<Map<String, Object>> response = new Response<>();
          Validate.validateObject(request, response, functionalError, loc);
          if (response.isHasError()) return response;
          return paymentService.confirmByReference(request, loc);
        },
        loc,
        exceptionUtils);
  }
}
