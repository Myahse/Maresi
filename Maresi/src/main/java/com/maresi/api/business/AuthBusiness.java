package com.maresi.api.business;

import com.maresi.api.config.AppProperties;
import com.maresi.api.contracts.FunctionalError;
import com.maresi.api.contracts.Request;
import com.maresi.api.contracts.Response;
import com.maresi.api.repository.NotificationRepository;
import com.maresi.api.repository.UserRepository;
import com.maresi.api.security.JwtService;
import com.maresi.api.service.EmailService;
import com.maresi.api.service.FileStorageService;
import com.maresi.api.service.OtpService;
import com.maresi.api.service.SmsService;
import com.maresi.api.util.PhoneNormalizer;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class AuthBusiness {
  private static final UUID DEV_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

  private final AppProperties props;
  private final UserRepository users;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;
  private final OtpService otpService;
  private final SmsService smsService;
  private final FileStorageService fileStorage;
  private final Environment env;
  private final FunctionalError functionalError;
  private final EmailService email;
  private final NotificationRepository notifications;

  public AuthBusiness(
      AppProperties props,
      UserRepository users,
      PasswordEncoder passwordEncoder,
      JwtService jwtService,
      OtpService otpService,
      SmsService smsService,
      FileStorageService fileStorage,
      Environment env,
      FunctionalError functionalError,
      EmailService email,
      NotificationRepository notifications) {
    this.props = props;
    this.users = users;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
    this.otpService = otpService;
    this.smsService = smsService;
    this.fileStorage = fileStorage;
    this.env = env;
    this.functionalError = functionalError;
    this.email = email;
    this.notifications = notifications;
  }

  public Response<Map<String, Object>> register(Request<Map<String, Object>> request, Locale locale) {
    return register(request, null, null, null, null, locale);
  }

  public Response<Map<String, Object>> register(
      Request<Map<String, Object>> request,
      MultipartFile selfie,
      MultipartFile idCardPhoto,
      String baseUrl,
      Locale locale) {
    return register(request, selfie, idCardPhoto, null, baseUrl, locale);
  }

  public Response<Map<String, Object>> register(
      Request<Map<String, Object>> request,
      MultipartFile selfie,
      MultipartFile idCardPhoto,
      MultipartFile idCardBack,
      String baseUrl,
      Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    Map<String, Object> body = request.getData() != null ? request.getData() : Map.of();
    if (props.isDevAuthBypass()) {
      response.setItem(devAuthPayload(body));
      response.setStatus(functionalError.success("Inscription", locale));
      return response;
    }

    String email = str(body.get("email"));
    String password = str(body.get("password"));
    String fullName = str(body.get("fullName"));
    if (fullName == null) fullName = str(body.get("full_name"));
    String phone = PhoneNormalizer.normalize(str(body.get("phone")));
    String idCard = str(body.get("id_card"));
    if (idCard == null) idCard = str(body.get("idCard"));
    String role = resolveRole(str(body.get("role")));

    if (email == null || password == null || fullName == null) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("email, password, fullName", locale));
      return response;
    }
    if (phone == null) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("phone", locale));
      return response;
    }
    if (!validIdCard(idCard)) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("id_card", locale));
      return response;
    }
    if (selfie == null || selfie.isEmpty() || idCardPhoto == null || idCardPhoto.isEmpty()) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("selfie, id_card_photo", locale));
      return response;
    }
    if (users.findByEmail(email).isPresent()) {
      response.setHasError(true);
      response.setStatus(functionalError.dataExist("Email deja enregistre", locale));
      return response;
    }

    String selfieUrl = fileStorage.storeIdentityImage(selfie, baseUrl);
    String idCardPhotoUrl = fileStorage.storeIdentityImage(idCardPhoto, baseUrl);
    String idCardBackUrl =
        idCardBack != null && !idCardBack.isEmpty()
            ? fileStorage.storeIdentityImage(idCardBack, baseUrl)
            : null;
    Map<String, Object> user =
        users.create(
            email,
            passwordEncoder.encode(password),
            fullName,
            role,
            phone,
            idCard.trim(),
            selfieUrl,
            idCardPhotoUrl,
            idCardBackUrl);
    welcomeNewAccount(user);
    response.setItem(authPayload(user));
    response.setStatus(functionalError.success("Inscription", locale));
    return response;
  }

  private void welcomeNewAccount(Map<String, Object> user) {
    UUID id = user.get("id") instanceof UUID u ? u : UUID.fromString(user.get("id").toString());
    boolean host = "owner".equals(str(user.get("role")));
    String title = host ? "Compte hote cree" : "Bienvenue sur Maresi";
    String body =
        host
            ? "Votre compte hote est pret. Publiez une residence et recevez des demandes."
            : "Votre compte est pret. Parcourez les residences et reservez.";
    notifications.create(id, "account", title, body, null);
    email.sendToUser(id, "Maresi — " + title, body + "\n\nTelephone enregistre : " + str(user.get("phone")));
  }

  public Response<Map<String, Object>> login(Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    Map<String, Object> body = request.getData();
    if (props.isDevAuthBypass()) {
      response.setItem(devAuthPayload(body));
      response.setStatus(functionalError.success("Connexion", locale));
      return response;
    }

    String email = str(body.get("email"));
    String password = str(body.get("password"));
    if (email == null || password == null) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("email, password", locale));
      return response;
    }

    Map<String, Object> user = users.findByEmail(email).orElse(null);
    if (user == null) {
      response.setHasError(true);
      response.setStatus(functionalError.loginFail(locale));
      return response;
    }
    String hash = str(user.get("password_hash"));
    if (hash == null || !passwordEncoder.matches(password, hash)) {
      response.setHasError(true);
      response.setStatus(functionalError.loginFail(locale));
      return response;
    }
    user.remove("password_hash");
    response.setItem(authPayload(user));
    response.setStatus(functionalError.success("Connexion", locale));
    return response;
  }

  public Response<Map<String, Object>> sendOtp(Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    String phone = PhoneNormalizer.normalize(str(request.getData().get("phone")));
    if (phone == null) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Numero de telephone invalide", locale));
      return response;
    }
    String code = otpService.generateCode();
    int expiresIn = otpService.setOtp(phone, code);
    smsService.sendOtpSms(phone, code);
    Map<String, Object> payload = new HashMap<>();
    payload.put("phone", phone);
    payload.put("expiresIn", expiresIn);
    payload.put("message", "Code de verification envoye");
    if (exposeDevCode()) payload.put("devCode", code);
    response.setItem(payload);
    response.setStatus(functionalError.success("OTP", locale));
    return response;
  }

  public Response<Map<String, Object>> verifyOtp(Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    String phone = PhoneNormalizer.normalize(str(request.getData().get("phone")));
    String code = str(request.getData().get("code"));
    if (phone == null) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Numero de telephone invalide", locale));
      return response;
    }
    if (code == null || !code.matches("\\d{4}")) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Code a 4 chiffres requis", locale));
      return response;
    }
    otpService.verifyOtp(phone, code.trim());

    if (props.isDevAuthBypass()) {
      Map<String, Object> user = new HashMap<>();
      user.put("id", DEV_USER_ID);
      user.put("email", phone.replaceAll("\\D", "") + "@phone.maresi.local");
      user.put("full_name", phone);
      user.put("role", "client");
      user.put("phone", phone);
      response.setItem(authPayload(user));
      response.setStatus(functionalError.success("Connexion OTP", locale));
      return response;
    }

    Map<String, Object> user =
        users
            .findByPhone(phone)
            .orElseGet(
                () ->
                    users.createFromPhone(
                        phone, "Utilisateur " + phone.substring(phone.length() - 4), "client"));
    response.setItem(authPayload(user));
    response.setStatus(functionalError.success("Connexion OTP", locale));
    return response;
  }

  private Map<String, Object> devAuthPayload(Map<String, Object> body) {
    String email = str(body.get("email"));
    if (email == null) email = "dev@localhost";
    String fullName = str(body.get("fullName"));
    if (fullName == null) fullName = str(body.get("full_name"));
    if (fullName == null) fullName = "Dev User";
    String role = resolveRole(str(body.get("role")));
    String phone = str(body.get("phone"));
    Map<String, Object> user = new HashMap<>();
    user.put("id", DEV_USER_ID);
    user.put("email", email);
    user.put("full_name", fullName);
    user.put("role", role);
    user.put("phone", phone);
    return authPayload(user);
  }

  private Map<String, Object> authPayload(Map<String, Object> user) {
    UUID id = user.get("id") instanceof UUID u ? u : UUID.fromString(user.get("id").toString());
    String email = str(user.get("email"));
    String role = str(user.get("role"));
    String phone = str(user.get("phone"));
    String token = jwtService.sign(id, email, role, phone);
    Map<String, Object> out = new HashMap<>();
    out.put("user", user);
    out.put("token", token);
    return out;
  }

  private boolean exposeDevCode() {
    return props.isDevAuthBypass()
        || !"production".equalsIgnoreCase(env.getProperty("spring.profiles.active", ""));
  }

  private static String resolveRole(String raw) {
    if (raw == null) return "client";
    String role = raw.trim().toLowerCase(Locale.ROOT);
    if ("owner".equals(role) || "host".equals(role)) return "owner";
    return "client";
  }

  private static boolean validIdCard(String idCard) {
    if (idCard == null) return false;
    String trimmed = idCard.trim();
    if (trimmed.length() < 5) return false;
    return trimmed.matches("[A-Za-z0-9\\-/\\s]+");
  }

  private static String str(Object v) {
    return v == null ? null : v.toString();
  }
}
