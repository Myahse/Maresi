package com.maresi.api.service;

import java.nio.charset.StandardCharsets;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;

public final class StayAgreementText {
  private static final DateTimeFormatter WHEN =
      DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(ZoneId.of("Africa/Abidjan"));

  private StayAgreementText() {}

  public static String document(Map<String, Object> visit, String signedBy) {
    String title = value(visit, "property_title", "la residence");
    String checkIn = value(visit, "check_in", "—");
    String checkOut = value(visit, "check_out", "—");
    String signedAt = visit.get("agreement_signed_at") != null
        ? String.valueOf(visit.get("agreement_signed_at"))
        : "";
    String signature =
        signedBy != null && !signedBy.isBlank()
            ? signedBy.trim()
            : "A signer dans l'application Maresi";

    return """
        ENGAGEMENT DE SOIN DU LOGEMENT — MARESI

        Residence : %s
        Sejour : %s → %s

        Avant de payer, le client confirme qu'il prendra soin de ce logement.

        1. Je prendrai soin de la residence et la laisserai propre.
        2. Je ne casserai, volerai ni n'endommagerai le mobilier, les cles ou le materiel.
           Je suis responsable des degats que je cause.
        3. Je respecterai le reglement interieur, les voisins et le nombre d'occupants.

        Signe par : %s
        Date : %s
        """
        .formatted(
            title,
            checkIn,
            checkOut,
            signature,
            signedAt.isBlank() ? WHEN.format(java.time.Instant.now()) : signedAt);
  }

  public static EmailService.Attachment attachment(Map<String, Object> visit, String signedBy) {
    byte[] bytes = document(visit, signedBy).getBytes(StandardCharsets.UTF_8);
    return new EmailService.Attachment("engagement-soin-maresi.txt", bytes);
  }

  private static String value(Map<String, Object> visit, String key, String fallback) {
    if (visit == null || visit.get(key) == null) return fallback;
    String v = String.valueOf(visit.get(key)).trim();
    return v.isEmpty() || "null".equalsIgnoreCase(v) ? fallback : v;
  }
}
