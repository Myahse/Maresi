package com.maresi.api.service;

import com.maresi.api.config.AppProperties;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public final class EmailTemplates {
  public record Mail(String subject, String text, String html) {}

  private record Detail(String label, String value) {}

  private record Highlight(String label, String value) {}

  private EmailTemplates() {}

  public static String guestApp(AppProperties props) {
    String origin = origin(props.getPayments().getSuccessUrl());
    return origin.isBlank() ? "https://maresi-sepia.vercel.app" : origin;
  }

  public static String hostApp(AppProperties props) {
    String origin = origin(props.getPayments().getHostSuccessUrl());
    return origin.isBlank() ? "https://host.ma-resi.com" : origin;
  }

  public static String origin(String url) {
    if (url == null || url.isBlank()) return "";
    try {
      URI parsed = URI.create(url.trim());
      if (parsed.getScheme() == null || parsed.getAuthority() == null) return "";
      return parsed.getScheme() + "://" + parsed.getAuthority();
    } catch (Exception e) {
      return "";
    }
  }

  public static Mail welcomeGuest(String phone, String ctaUrl) {
    return welcomeGuest(null, phone, ctaUrl);
  }

  public static Mail welcomeGuest(String name, String phone, String ctaUrl) {
    return build(
        "Bienvenue sur Maresi",
        "Compte",
        "Bienvenue chez vous",
        greet(
            name,
            "Votre compte Maresi est prêt. Explorez les résidences à Abidjan, comparez les quartiers et réservez en quelques étapes.\n\nGardez votre téléphone à portée : l’hôte vous contacte souvent par WhatsApp ou appel."),
        details("Voyageur", personName(name), "Téléphone", phone),
        null,
        "Voir les résidences",
        ctaUrl);
  }

  public static Mail welcomeHost(String phone, String ctaUrl) {
    return welcomeHost(null, phone, ctaUrl);
  }

  public static Mail welcomeHost(String name, String phone, String ctaUrl) {
    return build(
        "Votre compte hôte est prêt",
        "Compte hôte",
        "Votre espace hôte est ouvert",
        greet(
            name,
            "Votre compte hôte Maresi est prêt. Publiez une résidence, recevez des demandes et suivez chaque séjour depuis Maresi Hôte.\n\nPensez à indiquer vos horaires d’arrivée et de départ, puis vos liens Wave ou Orange Money."),
        details("Hôte", personName(name), "Téléphone", phone),
        null,
        "Ouvrir Maresi Hôte",
        ctaUrl);
  }

  public static Mail reservationSent(String title) {
    return build(
        "Demande envoyée",
        "Réservation",
        "Votre demande est partie",
        "Bonjour,\n\nNous avons bien transmis votre demande à l’hôte. Vous recevrez un e-mail dès qu’il accepte ou refuse.\n\nEn attendant, rien n’est encore confirmé : ne partez pas et n’effectuez aucun paiement.",
        details("Résidence", title),
        null,
        null,
        null);
  }

  public static Mail reservationNew(
      String title, String checkIn, String checkOut, String phone, String idCard, String ctaUrl) {
    return reservationNew(title, null, checkIn, checkOut, phone, idCard, ctaUrl);
  }

  public static Mail reservationNew(
      String title,
      String requesterName,
      String checkIn,
      String checkOut,
      String phone,
      String idCard,
      String ctaUrl) {
    String who = personName(requesterName);
    return build(
        who.isBlank() ? "Nouvelle réservation" : "Nouvelle réservation — " + who,
        "Réservation",
        who.isBlank() ? "Un client souhaite réserver" : who + " souhaite réserver",
        greet(
            null,
            (who.isBlank() ? "Un voyageur" : who)
                + " a demandé votre résidence. Vérifiez son dossier (selfie, pièce d’identité), puis acceptez ou refusez dans les 48 heures.\n\nS’il n’est pas le bon profil, refusez simplement : le client sera prévenu."),
        details(
            "Voyageur", who,
            "Résidence", title,
            "Arrivée", checkIn,
            "Départ", checkOut,
            "Téléphone", phone,
            "Pièce d’identité", idCard),
        null,
        "Voir la demande",
        ctaUrl);
  }

  public static Mail reservationAccepted(String title, String agreementUrl) {
    return build(
        "Demande acceptée",
        "Réservation",
        "Bonne nouvelle : l’hôte a accepté",
        "Bonjour,\n\nVotre demande a été acceptée. Signez maintenant l’engagement de soin du logement.\n\nEnsuite, vous recevrez un code à 6 chiffres à donner à l’hôte pour récupérer la clé. Le paiement se fait ensuite directement à l’hôte (Wave ou Orange Money).",
        details("Résidence", title, "Prochaine étape", "Signer l’engagement"),
        null,
        "Signer l’engagement",
        agreementUrl);
  }

  public static Mail reservationDeclined(String title) {
    return build(
        "Demande refusée",
        "Réservation",
        "Cette demande n’a pas abouti",
        "Bonjour,\n\nL’hôte a refusé votre demande. Ce n’est pas un blocage de votre compte : vous pouvez chercher une autre résidence tout de suite.\n\nLes disponibilités changent souvent à Abidjan, une autre option peut se libérer aujourd’hui.",
        details("Résidence", title),
        null,
        null,
        null);
  }

  public static Mail keyCodeHost(String title, String ctaUrl) {
    return keyCodeHost(title, null, ctaUrl);
  }

  public static Mail keyCodeHost(String title, String requesterName, String ctaUrl) {
    String who = personName(requesterName);
    return build(
        who.isBlank() ? "Le client a signé — entrez le code clé" : who + " a signé — entrez le code clé",
        "Clé",
        who.isBlank() ? "Le client a signé. Entrez le code" : who + " a signé. Entrez le code",
        greet(
            null,
            (who.isBlank() ? "Le client" : who)
                + " a signé l’engagement. Demandez-lui son code à 6 chiffres, saisissez-le dans Maresi Hôte, puis il pourra vous payer.\n\nNe communiquez jamais ce code à une autre personne."),
        details("Voyageur", who, "Résidence", title, "À faire", "Saisir le code à 6 chiffres"),
        null,
        "Saisir le code",
        ctaUrl);
  }

  public static Mail keyCodeGuest(String title, String keyCode) {
    return build(
        "Votre code clé",
        "Clé",
        "Voici votre code clé",
        "Bonjour,\n\nVotre engagement est enregistré. Donnez uniquement ce code à l’hôte pour récupérer la clé, puis payez-le dans Maresi.\n\nGardez ce message : sans ce code, l’hôte ne pourra pas confirmer la remise des clés.",
        details("Résidence", title),
        new Highlight("Code à 6 chiffres", keyCode),
        null,
        null);
  }

  public static Mail payHost(String ctaUrl) {
    return build(
        "Payez l’hôte",
        "Paiement",
        "C’est le moment de payer l’hôte",
        "Bonjour,\n\nL’hôte a confirmé le code clé. Payez-le maintenant depuis Maresi, via Wave ou Orange Money.\n\nUne fois le paiement envoyé, déclarez-le dans l’application pour que l’hôte puisse confirmer.",
        details("Moyen", "Wave ou Orange Money", "À faire", "Payer l’hôte, puis déclarer"),
        null,
        "Payer maintenant",
        ctaUrl);
  }

  public static Mail extensionRequested(String title, String until, String amount, String ctaUrl) {
    return extensionRequested(title, null, until, amount, ctaUrl);
  }

  public static Mail extensionRequested(
      String title, String requesterName, String until, String amount, String ctaUrl) {
    String who = personName(requesterName);
    return build(
        who.isBlank() ? "Prolongation demandée" : "Prolongation demandée — " + who,
        "Prolongation",
        who.isBlank() ? "Le client veut rester plus longtemps" : who + " veut rester plus longtemps",
        greet(
            null,
            (who.isBlank() ? "Le client" : who)
                + " souhaite prolonger son séjour. Vérifiez vos disponibilités, puis acceptez ou refusez.\n\nS’il y a déjà une réservation derrière, refusez pour éviter un chevauchement."),
        details(
            "Voyageur", who,
            "Résidence", title,
            "Nouveau départ", until,
            "Supplément", amount + " XOF"),
        null,
        "Répondre à la demande",
        ctaUrl);
  }

  public static Mail extensionAccepted(String title, String until) {
    return build(
        "Prolongation acceptée",
        "Prolongation",
        "Votre prolongation est acceptée",
        "Bonjour,\n\nL’hôte a accepté de prolonger votre séjour. Payez le supplément directement à l’hôte, puis déclarez le paiement dans Maresi.\n\nLe nouveau départ s’applique seulement après confirmation de l’hôte.",
        details("Résidence", title, "Nouveau départ", until),
        null,
        null,
        null);
  }

  public static Mail extensionDeclined(String title) {
    return build(
        "Prolongation refusée",
        "Prolongation",
        "La prolongation n’a pas été acceptée",
        "Bonjour,\n\nL’hôte a refusé de prolonger votre séjour. La date de départ initiale reste valable.\n\nPrévoyez de libérer la résidence à l’heure indiquée pour éviter un dépassement facturé.",
        details("Résidence", title),
        null,
        null,
        null);
  }

  public static Mail overstayDue(String amount, String until, String ctaUrl) {
    return build(
        "Dépassement à payer",
        "Dépassement",
        "Des nuits supplémentaires sont dues",
        "Bonjour,\n\nVotre séjour a dépassé la date de départ. L’hôte a facturé les nuits en plus.\n\nPayez ce montant à l’hôte pour régulariser votre présence jusqu’à la nouvelle date.",
        details("Nouveau départ", until, "Montant dû", amount + " XOF"),
        null,
        "Payer le dépassement",
        ctaUrl);
  }

  public static Mail hostApplySent() {
    return build(
        "Demande hôte envoyée",
        "Compte hôte",
        "Nous avons bien reçu votre demande",
        "Bonjour,\n\nVotre demande pour devenir hôte est en cours de vérification.\n\nNous vous écrivons dès qu’un administrateur Maresi l’accepte ou la refuse. Vous pourrez alors publier vos résidences.",
        List.of(),
        null,
        null,
        null);
  }

  public static Mail hostApplyAdmin(String fullName, String phone) {
    return build(
        "Nouvelle demande hôte",
        "Admin",
        "Une demande hôte attend votre avis",
        "Bonjour,\n\nUne personne souhaite devenir hôte. Vérifiez son identité, puis acceptez ou refusez dans l’espace admin.",
        details("Nom", fullName, "Téléphone", phone),
        null,
        null,
        null);
  }

  public static Mail hostActivated(String ctaUrl) {
    return build(
        "Compte hôte activé",
        "Compte hôte",
        "Vous pouvez publier vos résidences",
        "Bonjour,\n\nVotre demande a été acceptée. Votre compte hôte est actif.\n\nOuvrez Maresi Hôte, ajoutez vos photos, vos tarifs et vos moyens de paiement, puis recevez vos premières demandes.",
        List.of(),
        null,
        "Ouvrir Maresi Hôte",
        ctaUrl);
  }

  public static Mail hostRefused(String note) {
    String reason =
        note != null && !note.isBlank()
            ? note
            : "Votre demande pour devenir hôte n’a pas été retenue pour le moment.";
    return build(
        "Demande hôte refusée",
        "Compte hôte",
        "Votre demande n’a pas été acceptée",
        "Bonjour,\n\n"
            + reason
            + "\n\nVous pouvez rester sur Maresi en tant que voyageur, ou déposer une nouvelle demande plus tard avec un dossier plus complet.",
        List.of(),
        null,
        null,
        null);
  }

  public static Mail newReview(String name, int score, String listing, String comment) {
    List<Detail> rows = new ArrayList<>(details("Résidence", listing, "Note", score + " / 5", "Voyageur", name));
    if (comment != null && !comment.isBlank()) {
      rows.add(new Detail("Commentaire", comment.trim()));
    }
    return build(
        "Nouvel avis",
        "Avis",
        "Un voyageur a noté votre résidence",
        "Bonjour,\n\nUn avis vient d’être publié. Les notes aident les prochains voyageurs à vous choisir.\n\nMerci de continuer à soigner l’accueil et l’état du logement.",
        rows,
        null,
        null,
        null);
  }

  public static Mail checkinGuest(String title) {
    return build(
        "C’est l’heure d’arriver",
        "Séjour",
        "Votre arrivée commence maintenant",
        "Bonjour,\n\nC’est l’heure. Présentez-vous à la résidence avec votre pièce d’identité et le code clé si l’hôte le demande.\n\nSi vous êtes en retard, prévenez l’hôte directement.",
        details("Résidence", title),
        null,
        null,
        null);
  }

  public static Mail checkinHost(String title) {
    return build(
        "Arrivée du client",
        "Séjour",
        "Le client arrive aujourd’hui",
        "Bonjour,\n\nC’est l’heure d’arrivée. Préparez la clé et vérifiez que la résidence est prête.\n\nDemandez le code à 6 chiffres avant de remettre les accès, si ce n’est pas déjà fait.",
        details("Résidence", title),
        null,
        null,
        null);
  }

  public static Mail checkoutGuest(String title) {
    return build(
        "C’est l’heure de partir",
        "Séjour",
        "Votre départ est maintenant",
        "Bonjour,\n\nC’est l’heure de quitter la résidence. Laissez les lieux propres, refermez et rendez la clé à l’hôte.\n\nUn départ en retard peut être facturé en nuits supplémentaires.",
        details("Résidence", title),
        null,
        null,
        null);
  }

  public static Mail checkoutHost(String title) {
    return build(
        "Départ du client",
        "Séjour",
        "Le client doit quitter aujourd’hui",
        "Bonjour,\n\nC’est l’heure du départ. Vérifiez l’état de la résidence après le séjour.\n\nS’il reste, facturez le dépassement puis clôturez le séjour avec votre note hôte.",
        details("Résidence", title),
        null,
        null,
        null);
  }

  public static String personName(Map<String, Object> user) {
    if (user == null) return "";
    String first = clean(user.get("first_name"));
    String last = clean(user.get("last_name"));
    String combined = (first + " " + last).trim();
    if (!combined.isBlank()) return combined;
    return clean(user.get("full_name"));
  }

  public static String personName(String raw) {
    return clean(raw);
  }

  public static String firstName(String full) {
    String value = clean(full);
    if (value.isBlank()) return "";
    return value.split("\\s+")[0];
  }

  private static String greet(String name, String body) {
    String first = firstName(name);
    return (first.isBlank() ? "Bonjour," : "Bonjour " + first + ",") + "\n\n" + body;
  }

  private static String clean(Object raw) {
    if (raw == null) return "";
    String value = raw.toString().trim();
    if (value.isBlank() || "null".equalsIgnoreCase(value)) return "";
    return value;
  }

  public static Mail simple(String subject, String text) {
    return build(subject, "Maresi", subject, text, List.of(), null, null, null);
  }

  public static Mail withCta(String subject, String text, String ctaLabel, String ctaUrl) {
    return build(subject, "Maresi", subject, text, List.of(), null, ctaLabel, ctaUrl);
  }

  private static Mail build(
      String subject,
      String kicker,
      String title,
      String text,
      List<Detail> rows,
      Highlight highlight,
      String ctaLabel,
      String ctaUrl) {
    String clean = text == null ? "" : text.trim();
    StringBuilder plain = new StringBuilder(clean);
    for (Detail row : rows) {
      plain.append('\n').append(row.label()).append(" : ").append(row.value());
    }
    if (highlight != null) {
      plain.append('\n').append(highlight.label()).append(" : ").append(highlight.value());
    }
    if (ctaUrl != null && !ctaUrl.isBlank()) {
      plain.append("\n\n").append(ctaUrl);
    }
    return new Mail(
        "Maresi — " + subject,
        plain.toString(),
        layout(kicker, title, toHtml(clean), rowsHtml(rows), highlightHtml(highlight), ctaLabel, ctaUrl));
  }

  private static List<Detail> details(String... pairs) {
    List<Detail> rows = new ArrayList<>();
    for (int i = 0; i + 1 < pairs.length; i += 2) {
      String value = pairs[i + 1];
      if (value == null || value.isBlank()) continue;
      rows.add(new Detail(pairs[i], value));
    }
    return rows;
  }

  private static String highlightHtml(Highlight highlight) {
    if (highlight == null || highlight.value() == null || highlight.value().isBlank()) return "";
    return """
        <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="margin:4px 0 24px;">
          <tr>
            <td style="background:#ecfdf8;border:1px dashed #5eead4;border-radius:18px;padding:22px 16px;text-align:center;">
              <p style="margin:0 0 8px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:800;color:#0f766e;">%s</p>
              <p style="margin:0;font-size:36px;letter-spacing:.22em;font-weight:800;color:#115e59;font-family:Manrope,'Segoe UI',Arial,sans-serif;">%s</p>
            </td>
          </tr>
        </table>
        """
        .formatted(escape(highlight.label()), escape(highlight.value()));
  }

  private static String rowsHtml(List<Detail> rows) {
    if (rows == null || rows.isEmpty()) return "";
    StringBuilder sb = new StringBuilder();
    sb.append(
        "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin:4px 0 24px;background:#f6fbf9;border:1px solid #d5e8e4;border-radius:18px;overflow:hidden;\">");
    for (int i = 0; i < rows.size(); i++) {
      Detail row = rows.get(i);
      if (i > 0) {
        sb.append("<tr><td style=\"padding:0 18px;\"><div style=\"height:1px;background:#d5e8e4;font-size:0;line-height:0;\">&nbsp;</div></td></tr>");
      }
      sb.append("<tr><td style=\"padding:14px 18px;\">")
          .append("<p style=\"margin:0 0 4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:800;color:#5b7c76;\">")
          .append(escape(row.label()))
          .append("</p>")
          .append("<p style=\"margin:0;font-size:16px;line-height:1.45;font-weight:700;color:#134e4a;\">")
          .append(escape(row.value()).replace("\n", "<br>"))
          .append("</p></td></tr>");
    }
    sb.append("</table>");
    return sb.toString();
  }

  private static String toHtml(String text) {
    if (text == null || text.isBlank()) return "";
    String[] parts = text.split("\\n\\n+");
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < parts.length; i++) {
      String part = parts[i].trim();
      if (i == 0 && part.regionMatches(true, 0, "Bonjour", 0, 7)) {
        sb.append(
                "<p style=\"margin:0 0 12px;font-size:13px;font-weight:800;letter-spacing:.04em;color:#0f766e;\">")
            .append(escape(part.replaceAll(",\\s*$", "")))
            .append("</p>");
        continue;
      }
      boolean firstBody = i == 0 || (i == 1 && parts[0].regionMatches(true, 0, "Bonjour", 0, 7));
      sb.append("<p style=\"margin:0 0 14px;font-size:")
          .append(firstBody ? "16px" : "15px")
          .append(";line-height:1.65;color:")
          .append(firstBody ? "#1e2937" : "#475569")
          .append(";\">")
          .append(escape(part).replace("\n", "<br>"))
          .append("</p>");
    }
    return sb.toString();
  }

  private static String escape(String raw) {
    return raw.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;");
  }

  private static String layout(
      String kicker,
      String title,
      String bodyHtml,
      String detailsHtml,
      String highlightHtml,
      String ctaLabel,
      String ctaUrl) {
    String button = "";
    if (ctaLabel != null && ctaUrl != null && !ctaUrl.isBlank()) {
      button =
          """
          <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="margin:10px 0 8px;">
            <tr>
              <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="border-radius:999px;background:#0D9488;">
                      <a href="%s" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:800;color:#ffffff;text-decoration:none;letter-spacing:.01em;font-family:Manrope,'Segoe UI',Arial,sans-serif;">%s</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          """
              .formatted(escape(ctaUrl), escape(ctaLabel));
    }
    return """
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>%s</title>
          <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">
        </head>
        <body style="margin:0;padding:0;background:#e8f1ef;font-family:Manrope,'Segoe UI',Arial,sans-serif;">
          <div style="display:none;max-height:0;overflow:hidden;">%s · Maresi Abidjan</div>
          <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#e8f1ef;padding:32px 12px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:560px;">
                  <tr>
                    <td style="padding:0 8px 14px;font-family:Manrope,'Segoe UI',Arial,sans-serif;">
                      <p style="margin:0;font-size:15px;font-weight:800;font-style:italic;color:#0f766e;">Maresi</p>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:22px;overflow:hidden;border:1px solid #d5e6e2;">
                  <tr>
                    <td style="background:#0f766e;padding:28px 28px 24px;color:#ffffff;">
                      <p style="margin:0 0 14px;display:inline-block;padding:4px 10px;border-radius:999px;background:rgba(204,251,241,.18);font-family:Manrope,'Segoe UI',Arial,sans-serif;font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#ccfbf1;">%s</p>
                      <h1 style="margin:0;font-size:26px;line-height:1.25;font-weight:800;font-family:Manrope,'Segoe UI',Arial,sans-serif;">%s</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="height:5px;background:#99f6e4;font-size:0;line-height:0;">&nbsp;</td>
                  </tr>
                  <tr>
                    <td style="padding:28px 28px 12px;font-family:Manrope,'Segoe UI',Arial,sans-serif;">
                      %s
                      %s
                      %s
                      %s
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 28px 26px;border-top:1px solid #e6f0ed;font-family:Manrope,'Segoe UI',Arial,sans-serif;">
                      <p style="margin:0;font-size:13px;line-height:1.55;color:#0f766e;">Maresi · Abidjan · résidences et séjours</p>
                      <p style="margin:8px 0 0;font-size:12px;line-height:1.5;color:#94a3b8;">Message automatique. Pour une question sur un séjour, répondez à l’hôte dans l’application.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """
        .formatted(
            escape(title),
            escape(title),
            escape(kicker),
            escape(title),
            bodyHtml,
            highlightHtml,
            detailsHtml,
            button);
  }
}
