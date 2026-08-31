package com.maresi.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "maresi")
public class AppProperties {
  private Jwt jwt = new Jwt();
  private boolean devAuthBypass = true;
  private String uploadDir = "uploads";
  private R2 r2 = new R2();
  private Sms sms = new Sms();
  private GeniusPay geniuspay = new GeniusPay();
  private Payments payments = new Payments();
  private Push push = new Push();

  public Jwt getJwt() {
    return jwt;
  }

  public void setJwt(Jwt jwt) {
    this.jwt = jwt;
  }

  public boolean isDevAuthBypass() {
    return devAuthBypass;
  }

  public void setDevAuthBypass(boolean devAuthBypass) {
    this.devAuthBypass = devAuthBypass;
  }

  public String getUploadDir() {
    return uploadDir;
  }

  public void setUploadDir(String uploadDir) {
    this.uploadDir = uploadDir;
  }

  public R2 getR2() {
    return r2;
  }

  public void setR2(R2 r2) {
    this.r2 = r2;
  }

  public Sms getSms() {
    return sms;
  }

  public void setSms(Sms sms) {
    this.sms = sms;
  }

  public GeniusPay getGeniuspay() {
    return geniuspay;
  }

  public void setGeniuspay(GeniusPay geniuspay) {
    this.geniuspay = geniuspay;
  }

  public Payments getPayments() {
    return payments;
  }

  public void setPayments(Payments payments) {
    this.payments = payments;
  }

  public Push getPush() {
    return push;
  }

  public void setPush(Push push) {
    this.push = push;
  }

  public static class R2 {
    private String accountId = "";
    private String accessKeyId = "";
    private String secretAccessKey = "";
    private String bucket = "";
    private String endpoint = "";
    private String publicUrl = "";

    public boolean isConfigured() {
      return notBlank(accessKeyId)
          && notBlank(secretAccessKey)
          && notBlank(bucket)
          && notBlank(publicUrl)
          && (notBlank(endpoint) || notBlank(accountId));
    }

    public String resolvedEndpoint() {
      if (notBlank(endpoint)) {
        return endpoint.trim().replaceAll("/+$", "");
      }
      return "https://" + accountId.trim() + ".r2.cloudflarestorage.com";
    }

    public String resolvedPublicUrl() {
      return publicUrl == null ? "" : publicUrl.trim().replaceAll("/+$", "");
    }

    public String getAccountId() {
      return accountId;
    }

    public void setAccountId(String accountId) {
      this.accountId = accountId;
    }

    public String getAccessKeyId() {
      return accessKeyId;
    }

    public void setAccessKeyId(String accessKeyId) {
      this.accessKeyId = accessKeyId;
    }

    public String getSecretAccessKey() {
      return secretAccessKey;
    }

    public void setSecretAccessKey(String secretAccessKey) {
      this.secretAccessKey = secretAccessKey;
    }

    public String getBucket() {
      return bucket;
    }

    public void setBucket(String bucket) {
      this.bucket = bucket;
    }

    public String getEndpoint() {
      return endpoint;
    }

    public void setEndpoint(String endpoint) {
      this.endpoint = endpoint;
    }

    public String getPublicUrl() {
      return publicUrl;
    }

    public void setPublicUrl(String publicUrl) {
      this.publicUrl = publicUrl;
    }

    private static boolean notBlank(String value) {
      return value != null && !value.isBlank();
    }
  }

  public static class Jwt {
    private String secret = "maresi-dev-only-jwt-secret-not-for-production";
    private String expiresIn = "7d";

    public String getSecret() {
      return secret;
    }

    public void setSecret(String secret) {
      this.secret = secret;
    }

    public String getExpiresIn() {
      return expiresIn;
    }

    public void setExpiresIn(String expiresIn) {
      this.expiresIn = expiresIn;
    }
  }

  public static class Sms {
    private String provider = "mock";
    private Twilio twilio = new Twilio();

    public String getProvider() {
      return provider;
    }

    public void setProvider(String provider) {
      this.provider = provider;
    }

    public Twilio getTwilio() {
      return twilio;
    }

    public void setTwilio(Twilio twilio) {
      this.twilio = twilio;
    }
  }

  public static class Twilio {
    private String accountSid = "";
    private String authToken = "";
    private String phoneNumber = "";

    public String getAccountSid() {
      return accountSid;
    }

    public void setAccountSid(String accountSid) {
      this.accountSid = accountSid;
    }

    public String getAuthToken() {
      return authToken;
    }

    public void setAuthToken(String authToken) {
      this.authToken = authToken;
    }

    public String getPhoneNumber() {
      return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
      this.phoneNumber = phoneNumber;
    }
  }

  public static class GeniusPay {
    private String apiKey = "";
    private String apiSecret = "";
    private String webhookSecret = "";
    private String baseUrl = "https://pay.genius.ci/api/v1/merchant";
    private String payoutWalletId = "";

    public String getApiKey() {
      return apiKey;
    }

    public void setApiKey(String apiKey) {
      this.apiKey = apiKey;
    }

    public String getApiSecret() {
      return apiSecret;
    }

    public void setApiSecret(String apiSecret) {
      this.apiSecret = apiSecret;
    }

    public String getWebhookSecret() {
      return webhookSecret;
    }

    public void setWebhookSecret(String webhookSecret) {
      this.webhookSecret = webhookSecret;
    }

    public String getBaseUrl() {
      return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
      this.baseUrl = baseUrl;
    }

    public String getPayoutWalletId() {
      return payoutWalletId;
    }

    public void setPayoutWalletId(String payoutWalletId) {
      this.payoutWalletId = payoutWalletId;
    }
  }

  public static class Payments {
    private long ownerSubscriptionFcfa = 10000;
    private int reservationCommissionPercent = 10;
    private String successUrl = "http://localhost:3000/payments/success";
    private String errorUrl = "http://localhost:3000/payments/error";
    private String hostSuccessUrl = "";
    private String hostErrorUrl = "";

    public long getOwnerSubscriptionFcfa() {
      return ownerSubscriptionFcfa;
    }

    public void setOwnerSubscriptionFcfa(long ownerSubscriptionFcfa) {
      this.ownerSubscriptionFcfa = ownerSubscriptionFcfa;
    }

    public int getReservationCommissionPercent() {
      return reservationCommissionPercent;
    }

    public void setReservationCommissionPercent(int reservationCommissionPercent) {
      this.reservationCommissionPercent = reservationCommissionPercent;
    }

    public String getSuccessUrl() {
      return successUrl;
    }

    public void setSuccessUrl(String successUrl) {
      this.successUrl = successUrl;
    }

    public String getErrorUrl() {
      return errorUrl;
    }

    public void setErrorUrl(String errorUrl) {
      this.errorUrl = errorUrl;
    }

    public String getHostSuccessUrl() {
      return firstUrl(hostSuccessUrl, successUrl);
    }

    public void setHostSuccessUrl(String hostSuccessUrl) {
      this.hostSuccessUrl = hostSuccessUrl;
    }

    public String getHostErrorUrl() {
      return firstUrl(hostErrorUrl, errorUrl);
    }

    public void setHostErrorUrl(String hostErrorUrl) {
      this.hostErrorUrl = hostErrorUrl;
    }

    private static String firstUrl(String preferred, String fallback) {
      if (preferred != null && !preferred.isBlank()) return preferred;
      return fallback;
    }
  }

  public static class Push {
    private String vapidPublicKey = "";
    private String vapidPrivateKey = "";
    private String subject = "mailto:hello@maresi.app";

    public String getVapidPublicKey() {
      return vapidPublicKey;
    }

    public void setVapidPublicKey(String vapidPublicKey) {
      this.vapidPublicKey = vapidPublicKey;
    }

    public String getVapidPrivateKey() {
      return vapidPrivateKey;
    }

    public void setVapidPrivateKey(String vapidPrivateKey) {
      this.vapidPrivateKey = vapidPrivateKey;
    }

    public String getSubject() {
      return subject;
    }

    public void setSubject(String subject) {
      this.subject = subject;
    }

    public boolean isConfigured() {
      return vapidPublicKey != null
          && !vapidPublicKey.isBlank()
          && vapidPrivateKey != null
          && !vapidPrivateKey.isBlank();
    }
  }
}
