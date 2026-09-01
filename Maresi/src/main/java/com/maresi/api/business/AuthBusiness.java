package com.maresi.api.business;

import com.maresi.api.config.AppProperties;
import com.maresi.api.contracts.FunctionalError;
import com.maresi.api.contracts.Request;
import com.maresi.api.contracts.Response;
import com.maresi.api.repository.AuthTokenRepository;
import com.maresi.api.repository.NotificationRepository;
import com.maresi.api.repository.UserRepository;
import com.maresi.api.security.JwtService;
import com.maresi.api.service.EmailService;
import com.maresi.api.service.EmailTemplates;
import com.maresi.api.service.FileStorageService;
import com.maresi.api.service.OtpService;
import com.maresi.api.service.SmsService;
import com.maresi.api.util.PhoneNormalizer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class AuthBusiness {
  private static final UUID DEV_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
  private static final SecureRandom RANDOM = new SecureRandom();

  private final AppProperties props;
  private final UserRepository users;
  private final AuthTokenRepository authTokens;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;
  private final OtpService otpService;
  private final SmsService smsService;
  private final FileStorageService fileStorage;
  private final Environment env;
  private final FunctionalError functionalError;
  private final EmailService email;
  private final NotificationRepository notifications;
  private final HostApplicationBusiness hostApplications;
  private final HostStatus hostStatus;

  public AuthBusiness(
      AppProperties props,
      UserRepository users,
      AuthTokenRepository authTokens,
      PasswordEncoder passwordEncoder,
      JwtService jwtService,
      OtpService otpService,
      SmsService smsService,
      FileStorageService fileStorage,
      Environment env,
      FunctionalError functionalError,
      EmailService email,
      NotificationRepository notifications,
      HostApplicationBusiness hostApplications,
      HostStatus hostStatus) {
    this.props = props;
    this.users = users;
    this.authTokens = authTokens;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
    this.otpService = otpService;
    this.smsService = smsService;
    this.fileStorage = fileStorage;
    this.env = env;
    this.functionalError = functionalError;
    this.email = email;
    this.notifications = notifications;
    this.hostApplications = hostApplications;
    this.hostStatus = hostStatus;
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
    String firstName = str(body.get("first_name"));
    if (firstName == null) firstName = str(body.get("firstName"));
    String lastName = str(body.get("last_name"));
    if (lastName == null) lastName = str(body.get("lastName"));
    String fullName = str(body.get("fullName"));
    if (fullName == null) fullName = str(body.get("full_name"));
    if ((fullName == null || fullName.isBlank()) && firstName != null && lastName != null) {
      fullName = firstName.trim() + " " + lastName.trim();
    }
    if (firstName == null && fullName != null && !fullName.isBlank()) {
      String[] parts = fullName.trim().split("\\s+", 2);
      firstName = parts[0];
      lastName = parts.length > 1 ? parts[1] : parts[0];
    }
    LocalDate birthLocal =
        parseBirthDate(body.get("birth_date") != null ? body.get("birth_date") : body.get("birthDate"));
    String gender = normalizeGender(body.get("gender"));
    String phone = PhoneNormalizer.normalize(str(body.get("phone")));
    String idCard = str(body.get("id_card"));
    if (idCard == null) idCard = str(body.get("idCard"));
    boolean hostIntent = wantsHost(str(body.get("role")));
    String role = hostIntent ? "owner" : "client";

    if (email == null
        || password == null
        || firstName == null
        || firstName.isBlank()
        || lastName == null
        || lastName.isBlank()) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("email, password, first_name, last_name", locale));
      return response;
    }
    if (birthLocal == null) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("birth_date", locale));
      return response;
    }
    if (birthLocal.isAfter(LocalDate.now().minusYears(18))) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Vous devez avoir au moins 18 ans", locale));
      return response;
    }
    java.sql.Date birthDate = java.sql.Date.valueOf(birthLocal);
    if (gender == null) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("gender", locale));
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
      response.setStatus(functionalError.dataExist("Cet e-mail est déjà enregistré. Connectez-vous ou réinitialisez votre mot de passe.", locale));
      return response;
    }
    if (users.findByPhone(phone).isPresent()) {
      response.setHasError(true);
      response.setStatus(
          functionalError.dataExist(
              "Ce numéro de téléphone est déjà enregistré. Connectez-vous ou utilisez un autre numéro.",
              locale));
      return response;
    }

    String selfieUrl = fileStorage.storeIdentityImage(selfie, baseUrl);
    String idCardPhotoUrl = fileStorage.storeIdentityImage(idCardPhoto, baseUrl);
    String idCardBackUrl =
        idCardBack != null && !idCardBack.isEmpty()
            ? fileStorage.storeIdentityImage(idCardBack, baseUrl)
            : null;
    Map<String, Object> user;
    try {
      user =
          users.create(
              email,
              passwordEncoder.encode(password),
              fullName.trim(),
              firstName.trim(),
              lastName.trim(),
              birthDate,
              gender,
              role,
              phone,
              idCard.trim(),
              selfieUrl,
              idCardPhotoUrl,
              idCardBackUrl);
    } catch (DataIntegrityViolationException e) {
      response.setHasError(true);
      String detail = e.getMostSpecificCause() != null ? e.getMostSpecificCause().getMessage() : "";
      if (detail != null && detail.contains("idx_users_phone_unique")) {
        response.setStatus(
            functionalError.dataExist(
                "Ce numéro de téléphone est déjà enregistré. Connectez-vous ou utilisez un autre numéro.",
                locale));
      } else {
        response.setStatus(functionalError.dataExist("Cet e-mail est déjà enregistré. Connectez-vous ou réinitialisez votre mot de passe.", locale));
      }
      return response;
    }
    UUID userId = user.get("id") instanceof UUID u ? u : UUID.fromString(user.get("id").toString());
    if (hostIntent) {
      users.setHostIntent(userId, true);
      user.put("host_intent", true);
    }
    sendVerificationEmail(user, true, hostIntent);
    Map<String, Object> item = new HashMap<>();
    item.put("needs_email_verification", true);
    item.put("email", email);
    item.put("user", user);
    response.setItem(item);
    response.setStatus(functionalError.success("Confirmez votre e-mail", locale));
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
    String phone = str(user.get("phone"));
    String name = EmailTemplates.personName(user);
    email.sendToUser(
        id,
        host
            ? EmailTemplates.welcomeHost(name, phone, EmailTemplates.hostApp(props))
            : EmailTemplates.welcomeGuest(name, phone, EmailTemplates.guestApp(props) + "/properties"));
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
    if (!isEmailVerified(user)) {
      response.setHasError(true);
      response.setStatus(
          functionalError.authFail(
              "Confirmez votre adresse e-mail avant de vous connecter. Vérifiez votre boîte de réception ou renvoyez le lien.",
              locale));
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

  public Response<Map<String, Object>> verifyEmail(Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    String token = str(request.getData() != null ? request.getData().get("token") : null);
    if (token == null || token.length() < 20) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Lien de confirmation invalide ou expiré", locale));
      return response;
    }
    Map<String, Object> row = authTokens.findByHash(hashToken(token), "email_verify").orElse(null);
    if (row == null) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Lien de confirmation invalide ou expiré", locale));
      return response;
    }
    UUID userId = (UUID) row.get("user_id");
    UUID tokenId = (UUID) row.get("id");
    boolean tokenOpen = str(row.get("used_at")) == null || str(row.get("used_at")).isBlank();
    Instant expiresAt = parseInstant(row.get("expires_at"));
    boolean expired = expiresAt != null && expiresAt.isBefore(Instant.now());
    Map<String, Object> user = users.findById(userId).orElse(null);
    boolean alreadyVerified = user != null && isEmailVerified(user);
    if (tokenOpen && expired && !alreadyVerified) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Lien de confirmation invalide ou expiré", locale));
      return response;
    }
    if (!tokenOpen && !alreadyVerified) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Lien de confirmation invalide ou expiré", locale));
      return response;
    }
    users.markEmailVerified(userId);
    if (tokenOpen) {
      authTokens.markUsed(tokenId);
    }
    user = users.findById(userId).orElse(user);
    boolean hostSignup = false;
    try {
      hostSignup = users.consumeHostIntent(userId);
    } catch (RuntimeException ignored) {
      hostSignup = false;
    }
    if (user != null) {
      try {
        if (hostSignup) {
          hostApplications.submitFromVerifiedSignup(user);
        } else if (!alreadyVerified) {
          welcomeNewAccount(user);
        }
      } catch (RuntimeException ignored) {
        /* email is confirmed even if welcome/host apply fails */
      }
    }
    Map<String, Object> item = new HashMap<>();
    if (user != null) {
      hostStatus.attach(user);
    }
    boolean hostTrack = hostSignup || (user != null && hostStatus.isHostTrack(user));
    item.put("verified", true);
    item.put("email", user != null ? user.get("email") : null);
    item.put("role", user != null ? user.get("role") : null);
    item.put("host_application", hostTrack);
    item.put("host_status", user != null ? user.get("host_status") : null);
    response.setItem(item);
    response.setStatus(functionalError.success("E-mail confirmé", locale));
    return response;
  }

  public Response<Map<String, Object>> resendVerification(Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    String emailAddr = str(request.getData() != null ? request.getData().get("email") : null);
    if (emailAddr == null || emailAddr.isBlank()) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("email", locale));
      return response;
    }
    users.findByEmail(emailAddr.trim()).ifPresent(user -> {
      if (!isEmailVerified(user)) {
        sendVerificationEmail(user, false, false);
      }
    });
    Map<String, Object> item = new HashMap<>();
    item.put("sent", true);
    response.setItem(item);
    response.setStatus(functionalError.success("Si un compte existe, un e-mail a été envoyé", locale));
    return response;
  }

  public Response<Map<String, Object>> forgotPassword(Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    Map<String, Object> body = request.getData() != null ? request.getData() : Map.of();
    String emailAddr = str(body.get("email"));
    if (emailAddr == null) {
      response.setHasError(true);
      response.setStatus(functionalError.fieldEmpty("email", locale));
      return response;
    }
    String app = str(body.get("app"));
    users.findByEmail(emailAddr).ifPresent(user -> sendResetEmail(user, app));
    Map<String, Object> item = new HashMap<>();
    item.put("sent", true);
    response.setItem(item);
    response.setStatus(functionalError.success("Si un compte existe, un e-mail a été envoyé", locale));
    return response;
  }

  public Response<Map<String, Object>> resetPassword(Request<Map<String, Object>> request, Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    Map<String, Object> body = request.getData() != null ? request.getData() : Map.of();
    String token = str(body.get("token"));
    String password = str(body.get("password"));
    if (token == null || token.length() < 20) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Lien de réinitialisation invalide ou expiré", locale));
      return response;
    }
    if (password == null || password.length() < 6) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Le mot de passe doit contenir au moins 6 caractères", locale));
      return response;
    }
    Map<String, Object> row = authTokens.findValid(hashToken(token), "password_reset").orElse(null);
    if (row == null) {
      response.setHasError(true);
      response.setStatus(functionalError.invalidData("Lien de réinitialisation invalide ou expiré", locale));
      return response;
    }
    UUID userId = (UUID) row.get("user_id");
    users.updatePassword(userId, passwordEncoder.encode(password));
    authTokens.markUsed((UUID) row.get("id"));
    authTokens.invalidateOpen(userId, "password_reset");
    Map<String, Object> item = new HashMap<>();
    item.put("reset", true);
    response.setItem(item);
    response.setStatus(functionalError.success("Mot de passe mis à jour", locale));
    return response;
  }

  private void sendVerificationEmail(Map<String, Object> user, boolean replaceExisting, boolean hostSignup) {
    UUID id = user.get("id") instanceof UUID u ? u : UUID.fromString(user.get("id").toString());
    String token = newToken();
    if (replaceExisting) {
      authTokens.invalidateOpen(id, "email_verify");
    }
    authTokens.create(id, "email_verify", hashToken(token), Instant.now().plus(Duration.ofHours(24)));
    boolean host = hostSignup || hostStatus.isHostTrack(user);
    String origin = host ? EmailTemplates.hostApp(props) : EmailTemplates.guestApp(props);
    String url = origin + "/verify-email?token=" + token;
    email.sendToUserNow(id, EmailTemplates.verifyEmail(EmailTemplates.personName(user), url));
  }

  private void sendResetEmail(Map<String, Object> user, String app) {
    UUID id = user.get("id") instanceof UUID u ? u : UUID.fromString(user.get("id").toString());
    String token = newToken();
    authTokens.invalidateOpen(id, "password_reset");
    authTokens.create(id, "password_reset", hashToken(token), Instant.now().plus(Duration.ofHours(1)));
    boolean host = app != null && app.trim().equalsIgnoreCase("host");
    String origin = host ? EmailTemplates.hostApp(props) : EmailTemplates.guestApp(props);
    String url = origin + "/reset-password?token=" + token;
    email.sendToUserNow(id, EmailTemplates.passwordReset(EmailTemplates.personName(user), url));
  }

  private static boolean isEmailVerified(Map<String, Object> user) {
    Object raw = user.get("email_verified");
    if (raw == null) return false;
    if (raw instanceof Boolean b) return b;
    if (raw instanceof Number n) return n.intValue() != 0;
    String value = String.valueOf(raw).trim();
    if (value.equalsIgnoreCase("t") || value.equalsIgnoreCase("true") || value.equals("1")) return true;
    if (value.equalsIgnoreCase("f") || value.equalsIgnoreCase("false") || value.equals("0")) return false;
    return Boolean.parseBoolean(value);
  }

  private static String newToken() {
    byte[] raw = new byte[32];
    RANDOM.nextBytes(raw);
    return HexFormat.of().formatHex(raw);
  }

  private static String hashToken(String token) {
    try {
      byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(digest);
    } catch (Exception e) {
      throw new IllegalStateException("Cannot hash token", e);
    }
  }

  private Map<String, Object> devAuthPayload(Map<String, Object> body) {
    String email = str(body.get("email"));
    if (email == null) email = "dev@localhost";
    String fullName = str(body.get("fullName"));
    if (fullName == null) fullName = str(body.get("full_name"));
    if (fullName == null) fullName = "Dev User";
    String role = "client";
    String phone = str(body.get("phone"));
    Map<String, Object> user = new HashMap<>();
    user.put("id", DEV_USER_ID);
    user.put("email", email);
    user.put("full_name", fullName);
    user.put("role", role);
    user.put("phone", phone);
    return authPayload(user);
  }

  private void ensureHostRole(Map<String, Object> user) {
    if (user == null || user.get("id") == null) return;
    hostStatus.attach(user);
    if (!"client".equals(str(user.get("role"))) || !hostStatus.isHostTrack(user)) return;
    UUID id = user.get("id") instanceof UUID u ? u : UUID.fromString(user.get("id").toString());
    users.updateRole(id, "owner").ifPresent(updated -> user.put("role", "owner"));
  }

  private Map<String, Object> authPayload(Map<String, Object> user) {
    ensureHostRole(user);
    UUID id = user.get("id") instanceof UUID u ? u : UUID.fromString(user.get("id").toString());
    String email = str(user.get("email"));
    String role = str(user.get("role"));
    String phone = str(user.get("phone"));
    hostStatus.attach(user);
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

  private static boolean wantsHost(String raw) {
    if (raw == null) return false;
    String value = raw.trim().toLowerCase(Locale.ROOT);
    return "owner".equals(value) || "host".equals(value);
  }

  private static boolean validIdCard(String idCard) {
    if (idCard == null) return false;
    String trimmed = idCard.trim();
    if (trimmed.length() < 5) return false;
    return trimmed.matches("[A-Za-z0-9\\-/\\s]+");
  }

  private static LocalDate parseBirthDate(Object raw) {
    if (raw == null) return null;
    String value = raw.toString().trim();
    if (value.isEmpty()) return null;
    try {
      return LocalDate.parse(value);
    } catch (Exception ignored) {
      return null;
    }
  }

  private static String normalizeGender(Object raw) {
    if (raw == null) return null;
    String gender = raw.toString().trim().toLowerCase(Locale.ROOT);
    if (Set.of("male", "homme", "m").contains(gender)) return "male";
    if (Set.of("female", "femme", "f").contains(gender)) return "female";
    if (Set.of("other", "autre").contains(gender)) return "other";
    return null;
  }

  private static Instant parseInstant(Object raw) {
    if (raw == null) return null;
    String value = raw.toString().trim();
    if (value.isEmpty()) return null;
    try {
      return Instant.parse(value);
    } catch (Exception ignored) {
      return null;
    }
  }

  private static String str(Object v) {
    return v == null ? null : v.toString();
  }
}
