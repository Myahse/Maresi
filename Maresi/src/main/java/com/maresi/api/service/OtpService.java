package com.maresi.api.service;

import com.maresi.api.config.AppProperties;
import com.maresi.api.exception.ApiException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class OtpService {
  private static final long OTP_TTL_MS = 5 * 60 * 1000;
  private static final int MAX_ATTEMPTS = 5;
  private static final long RESEND_COOLDOWN_MS = 60 * 1000;

  private final SecureRandom random = new SecureRandom();
  private final Map<String, OtpEntry> store = new ConcurrentHashMap<>();

  public String generateCode() {
    return String.valueOf(1000 + random.nextInt(9000));
  }

  public int setOtp(String phone, String code) {
    long now = System.currentTimeMillis();
    OtpEntry existing = store.get(phone);
    if (existing != null && now - existing.lastSentAt < RESEND_COOLDOWN_MS) {
      long waitSec = (long) Math.ceil((RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000.0);
      throw ApiException.of(429, "Please wait " + waitSec + "s before requesting a new code");
    }
    store.put(
        phone,
        new OtpEntry(hashCode(code), now + OTP_TTL_MS, 0, now));
    return (int) (OTP_TTL_MS / 1000);
  }

  public void verifyOtp(String phone, String code) {
    OtpEntry entry = store.get(phone);
    if (entry == null) {
      throw ApiException.of(400, "No code sent for this number. Request a new one.");
    }
    long now = System.currentTimeMillis();
    if (now > entry.expiresAt) {
      store.remove(phone);
      throw ApiException.of(400, "Code expired. Request a new one.");
    }
    if (entry.attempts >= MAX_ATTEMPTS) {
      store.remove(phone);
      throw ApiException.of(429, "Too many attempts. Request a new code.");
    }
    entry.attempts += 1;
    if (!hashCode(code).equals(entry.hash)) {
      throw ApiException.of(401, "Invalid verification code");
    }
    store.remove(phone);
  }

  private static String hashCode(String code) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hash = digest.digest(String.valueOf(code).getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(hash);
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  private static final class OtpEntry {
    final String hash;
    final long expiresAt;
    int attempts;
    final long lastSentAt;

    OtpEntry(String hash, long expiresAt, int attempts, long lastSentAt) {
      this.hash = hash;
      this.expiresAt = expiresAt;
      this.attempts = attempts;
      this.lastSentAt = lastSentAt;
    }
  }
}
