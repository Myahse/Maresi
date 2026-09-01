package com.maresi.api.controller;

import com.maresi.api.contracts.ControllerSupport;
import com.maresi.api.contracts.ExceptionUtils;
import com.maresi.api.contracts.FunctionalError;
import com.maresi.api.contracts.Request;
import com.maresi.api.contracts.Response;
import com.maresi.api.contracts.Validate;
import com.maresi.api.contracts.RequestMapper;
import com.maresi.api.dto.AuthLoginDataDto;
import com.maresi.api.dto.AuthRegisterDataDto;
import com.maresi.api.dto.OtpSendDataDto;
import com.maresi.api.dto.OtpVerifyDataDto;
import com.maresi.api.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Auth", description = "Inscription, connexion et OTP")
public class AuthController {
  private final AuthService authService;
  private final FunctionalError functionalError;
  private final ExceptionUtils exceptionUtils;
  private final RequestMapper requestMapper;

  public AuthController(
      AuthService authService,
      FunctionalError functionalError,
      ExceptionUtils exceptionUtils,
      RequestMapper requestMapper) {
    this.authService = authService;
    this.functionalError = functionalError;
    this.exceptionUtils = exceptionUtils;
    this.requestMapper = requestMapper;
  }

  @PostMapping(value = "/register", consumes = MediaType.APPLICATION_JSON_VALUE)
  @Operation(summary = "Créer un compte (JSON, identité requise via multipart)")
  public ResponseEntity<Response<Map<String, Object>>> register(
      @RequestBody Request<AuthRegisterDataDto> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    Request<Map<String, Object>> mapRequest = requestMapper.toMapRequest(request);
    return ControllerSupport.runCreated(
        () -> {
          Response<Map<String, Object>> response = new Response<>();
          Validate.validateObject(mapRequest, response, functionalError, loc);
          if (response.isHasError()) return response;
          return authService.register(mapRequest, loc);
        },
        loc,
        exceptionUtils);
  }

  @PostMapping(value = "/register", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @Operation(summary = "Créer un compte client ou hôte avec pièce d'identité")
  public ResponseEntity<Response<Map<String, Object>>> registerMultipart(
      @RequestParam String email,
      @RequestParam String password,
      @RequestParam(required = false) String fullName,
      @RequestParam(name = "full_name", required = false) String fullNameSnake,
      @RequestParam(name = "first_name", required = false) String firstName,
      @RequestParam(name = "last_name", required = false) String lastName,
      @RequestParam(name = "birth_date", required = false) String birthDate,
      @RequestParam(required = false) String gender,
      @RequestParam String phone,
      @RequestParam(required = false) String role,
      @RequestParam(name = "id_card", required = false) String idCard,
      @RequestParam(name = "idCard", required = false) String idCardCamel,
      @RequestPart("selfie") MultipartFile selfie,
      @RequestPart(name = "id_card_photo") MultipartFile idCardPhoto,
      @RequestPart(name = "id_card_back", required = false) MultipartFile idCardBack,
      Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    String baseUrl = ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();
    Map<String, Object> data = new HashMap<>();
    data.put("email", email);
    data.put("password", password);
    data.put("fullName", fullName != null ? fullName : fullNameSnake);
    data.put("full_name", fullName != null ? fullName : fullNameSnake);
    data.put("first_name", firstName);
    data.put("last_name", lastName);
    data.put("birth_date", birthDate);
    data.put("gender", gender);
    data.put("phone", phone);
    data.put("role", role);
    data.put("id_card", idCard != null ? idCard : idCardCamel);
    Request<Map<String, Object>> mapRequest = new Request<>();
    mapRequest.setData(data);
    return ControllerSupport.runCreated(
        () -> authService.register(mapRequest, selfie, idCardPhoto, idCardBack, baseUrl, loc),
        loc,
        exceptionUtils);
  }

  @PostMapping("/login")
  @Operation(summary = "Connexion email / mot de passe")
  public ResponseEntity<Response<Map<String, Object>>> login(
      @RequestBody Request<AuthLoginDataDto> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    Request<Map<String, Object>> mapRequest = requestMapper.toMapRequest(request);
    return ControllerSupport.run(
        () -> {
          Response<Map<String, Object>> response = new Response<>();
          Validate.validateObject(mapRequest, response, functionalError, loc);
          if (response.isHasError()) return response;
          return authService.login(mapRequest, loc);
        },
        loc,
        exceptionUtils);
  }

  @PostMapping("/otp/send")
  @Operation(summary = "Envoyer un code OTP par SMS")
  public ResponseEntity<Response<Map<String, Object>>> sendOtp(
      @RequestBody Request<OtpSendDataDto> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    Request<Map<String, Object>> mapRequest = requestMapper.toMapRequest(request);
    return ControllerSupport.run(
        () -> {
          Response<Map<String, Object>> response = new Response<>();
          Validate.validateObject(mapRequest, response, functionalError, loc);
          if (response.isHasError()) return response;
          return authService.sendOtp(mapRequest, loc);
        },
        loc,
        exceptionUtils);
  }

  @PostMapping("/verify-email")
  @Operation(summary = "Confirmer l'adresse e-mail")
  public ResponseEntity<Response<Map<String, Object>>> verifyEmail(
      @RequestBody Request<Map<String, Object>> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(() -> authService.verifyEmail(request, loc), loc, exceptionUtils);
  }

  @PostMapping("/resend-verification")
  @Operation(summary = "Renvoyer l'e-mail de confirmation")
  public ResponseEntity<Response<Map<String, Object>>> resendVerification(
      @RequestBody Request<Map<String, Object>> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(() -> authService.resendVerification(request, loc), loc, exceptionUtils);
  }

  @PostMapping("/forgot-password")
  @Operation(summary = "Demander un lien de réinitialisation")
  public ResponseEntity<Response<Map<String, Object>>> forgotPassword(
      @RequestBody Request<Map<String, Object>> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(() -> authService.forgotPassword(request, loc), loc, exceptionUtils);
  }

  @PostMapping("/reset-password")
  @Operation(summary = "Choisir un nouveau mot de passe")
  public ResponseEntity<Response<Map<String, Object>>> resetPassword(
      @RequestBody Request<Map<String, Object>> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    return ControllerSupport.run(() -> authService.resetPassword(request, loc), loc, exceptionUtils);
  }

  @PostMapping("/otp/verify")
  @Operation(summary = "Vérifier le code OTP et obtenir un JWT")
  public ResponseEntity<Response<Map<String, Object>>> verifyOtp(
      @RequestBody Request<OtpVerifyDataDto> request, Locale locale) {
    Locale loc = ControllerSupport.locale(locale);
    Request<Map<String, Object>> mapRequest = requestMapper.toMapRequest(request);
    return ControllerSupport.run(
        () -> {
          Response<Map<String, Object>> response = new Response<>();
          Validate.validateObject(mapRequest, response, functionalError, loc);
          if (response.isHasError()) return response;
          return authService.verifyOtp(mapRequest, loc);
        },
        loc,
        exceptionUtils);
  }
}
