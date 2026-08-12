package com.maresi.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "maresi")
public class AppProperties {
  private Jwt jwt = new Jwt();
  private boolean devAuthBypass = true;
  private String uploadDir = "uploads";
  private Sms sms = new Sms();
  private GeniusPay geniuspay = new GeniusPay();
  private Payments payments = new Payments();

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
  }

  public static class Payments {
    private long ownerSubscriptionFcfa = 10000;
    private int reservationCommissionPercent = 10;
    private String successUrl = "http://localhost:3000/payments/success";
    private String errorUrl = "http://localhost:3000/payments/error";

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
  }
}
