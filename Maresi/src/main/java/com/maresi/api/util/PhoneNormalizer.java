package com.maresi.api.util;

public final class PhoneNormalizer {
  private PhoneNormalizer() {}

  public static String normalize(String raw) {
    if (raw == null) return null;
    String trimmed = raw.trim();
    String digits = trimmed.replaceAll("\\D", "");
    if (digits.isEmpty()) return null;
    String normalized = trimmed.startsWith("+") ? "+" + digits : "+" + digits;
    int len = normalized.length() - 1;
    if (len < 8 || len > 16) return null;
    return normalized;
  }
}
