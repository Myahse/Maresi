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
import java.util.Locale;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

  @PostMapping("/register")
  @Operation(summary = "Créer un compte (client ou propriétaire)")
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
