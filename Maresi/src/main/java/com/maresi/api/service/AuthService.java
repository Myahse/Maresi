package com.maresi.api.service;

import com.maresi.api.business.AuthBusiness;
import com.maresi.api.contracts.Request;
import com.maresi.api.contracts.Response;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class AuthService {
  private final AuthBusiness authBusiness;

  public AuthService(AuthBusiness authBusiness) {
    this.authBusiness = authBusiness;
  }

  public Response<Map<String, Object>> register(Request<Map<String, Object>> request, Locale locale) {
    return authBusiness.register(request, locale);
  }

  public Response<Map<String, Object>> register(
      Request<Map<String, Object>> request,
      MultipartFile selfie,
      MultipartFile idCardPhoto,
      String baseUrl,
      Locale locale) {
    return authBusiness.register(request, selfie, idCardPhoto, baseUrl, locale);
  }

  public Response<Map<String, Object>> login(Request<Map<String, Object>> request, Locale locale) {
    return authBusiness.login(request, locale);
  }

  public Response<Map<String, Object>> sendOtp(Request<Map<String, Object>> request, Locale locale) {
    return authBusiness.sendOtp(request, locale);
  }

  public Response<Map<String, Object>> verifyOtp(Request<Map<String, Object>> request, Locale locale) {
    return authBusiness.verifyOtp(request, locale);
  }
}
