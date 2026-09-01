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
    return firstAppOrigin(
        props.getApps().getGuestUrl(),
        origin(props.getPayments().getSuccessUrl()),
        "https://ma-resi.com");
  }

  public static String hostApp(AppProperties props) {
    return firstAppOrigin(
        props.getApps().getHostUrl(),
        origin(props.getPayments().getHostSuccessUrl()),
        "https://host.ma-resi.com");
  }

  private static String firstAppOrigin(String explicit, String fromPayment, String fallback) {
    String configured = stripSlash(explicit);
    if (!configured.isBlank()) return configured;
    String paymentOrigin = stripSlash(fromPayment);
    if (isStableAppOrigin(paymentOrigin)) return paymentOrigin;
    return fallback;
  }

  private static boolean isStableAppOrigin(String origin) {
    if (origin == null || origin.isBlank()) return false;
    String lower = origin.toLowerCase();
    if (lower.contains("localhost") || lower.contains("127.0.0.1")) return false;
    if (lower.contains("vercel.app") || lower.contains("maresi-sepia")) return false;
    return lower.startsWith("http://") || lower.startsWith("https://");
  }

  private static String stripSlash(String url) {
    if (url == null) return "";
    String value = url.trim();
    while (value.endsWith("/")) {
      value = value.substring(0, value.length() - 1);
    }
    return value;
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
            "Votre compte hôte Maresi est prêt. Publiez une résidence, recevez des demandes et suivez chaque séjour depuis Maresi Hôte."),
        details("Hôte", personName(name), "Téléphone", phone),
        null,
        "Ouvrir Maresi Hôte",
        ctaUrl);
  }

  public static Mail verifyEmail(String name, String ctaUrl) {
    return build(
        "Confirmez votre e-mail",
        "Compte",
        "Confirmez votre adresse e-mail",
        greet(
            name,
            "Merci de vous être inscrit sur Maresi. Cliquez sur le bouton pour confirmer votre adresse e-mail. Ce lien expire dans 24 heures.\n\nSi vous n’êtes pas à l’origine de cette inscription, ignorez ce message."),
        details("Compte", personName(name)),
        null,
        "Confirmer mon e-mail",
        ctaUrl);
  }

  public static Mail passwordReset(String name, String ctaUrl) {
    return build(
        "Réinitialiser le mot de passe",
        "Compte",
        "Réinitialisez votre mot de passe",
        greet(
            name,
            "Nous avons reçu une demande pour changer le mot de passe de votre compte Maresi. Cliquez sur le bouton pour en choisir un nouveau. Ce lien expire dans 1 heure.\n\nSi vous n’êtes pas à l’origine de cette demande, ignorez ce message."),
        List.of(),
        null,
        "Choisir un nouveau mot de passe",
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

  public static Mail hostApplySent(String ctaUrl) {
    return build(
        "Demande hôte envoyée",
        "Compte hôte",
        "Nous avons bien reçu votre demande",
        "Bonjour,\n\nVotre demande pour devenir hôte est en cours de vérification.\n\nOuvrez Maresi Hôte pour suivre votre dossier. Vous pourrez publier des résidences seulement après validation.",
        List.of(),
        null,
        "Ouvrir Maresi Hôte",
        ctaUrl);
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

  public static Mail hostRefused(String note, String ctaUrl) {
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
            + "\n\nCorrigez les points indiqués, puis renvoyez votre demande depuis Maresi Hôte.",
        List.of(),
        null,
        "Corriger et renvoyer",
        ctaUrl);
  }

  public static Mail identityCorrection(String name, String message, boolean suspended, String ctaUrl) {
    String extra =
        suspended
            ? "Votre compte est suspendu jusqu’à ce que vous mettiez à jour votre dossier. Vous pouvez toujours vous connecter pour corriger vos informations."
            : "Vous pouvez continuer à utiliser Maresi, mais merci de corriger ces informations dès que possible.";
    String body = message == null || message.isBlank() ? extra : message.trim() + "\n\n" + extra;
    return build(
        "Mettez à jour vos informations",
        "Compte",
        "Une correction est nécessaire",
        greet(name, body),
        List.of(),
        null,
        "Mettre à jour mes informations",
        ctaUrl);
  }

  public static Mail identityUpdatedAdmin(String name, String email, String role) {
    return build(
        "Dossier d’identité mis à jour",
        "Admin",
        "Un compte a corrigé son dossier",
        "Bonjour,\n\n"
            + personName(name)
            + " a mis à jour ses informations d’identité après une demande de correction. Vérifiez le dossier dans l’espace admin.",
        details("Nom", personName(name), "E-mail", email, "Rôle", role),
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
        <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
          <tr>
            <td style="background:#f8fafc;border:1px solid #e2e8f0;padding:16px 18px;">
              <p style="margin:0 0 6px;font-size:12px;color:#64748b;">%s</p>
              <p style="margin:0;font-size:28px;letter-spacing:.16em;font-weight:700;color:#0f172a;font-family:Manrope,'Segoe UI',Arial,sans-serif;">%s</p>
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
        "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin:4px 0 24px;border-top:1px solid #e2e8f0;\">");
    for (Detail row : rows) {
      sb.append("<tr>")
          .append("<td style=\"padding:11px 0;font-size:13px;color:#64748b;width:38%;border-bottom:1px solid #e2e8f0;vertical-align:top;\">")
          .append(escape(row.label()))
          .append("</td>")
          .append("<td style=\"padding:11px 0;font-size:14px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;\">")
          .append(escape(row.value()).replace("\n", "<br>"))
          .append("</td>")
          .append("</tr>");
    }
    sb.append("</table>");
    return sb.toString();
  }

  private static String toHtml(String text) {
    if (text == null || text.isBlank()) return "";
    String[] parts = text.split("\\n\\n+");
    StringBuilder sb = new StringBuilder();
    for (String raw : parts) {
      String part = raw.trim();
      sb.append("<p style=\"margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155;\">")
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
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;">
            <tr>
              <td style="background:#0D9488;">
                <a href="%s" style="display:inline-block;padding:11px 18px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;font-family:Manrope,'Segoe UI',Arial,sans-serif;">%s</a>
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
        </head>
        <body style="margin:0;padding:0;background:#f4f4f5;font-family:Manrope,'Segoe UI',Arial,sans-serif;">
          <div style="display:none;max-height:0;overflow:hidden;">%s</div>
          <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:28px 12px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e4e4e7;">
                  <tr>
                    <td style="padding:28px 28px 0;font-family:Manrope,'Segoe UI',Arial,sans-serif;">
                      <table role="presentation" width="100%%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="font-size:15px;font-weight:700;color:#0D9488;">Maresi</td>
                          <td align="right" style="font-size:12px;color:#71717a;">%s</td>
                        </tr>
                      </table>
                      <div style="margin:16px 0 0;border-top:1px solid #e4e4e7;font-size:0;line-height:0;">&nbsp;</div>
                      <h1 style="margin:20px 0 16px;font-size:20px;line-height:1.35;font-weight:600;color:#18181b;">%s</h1>
                      %s
                      %s
                      %s
                      %s
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 28px 28px;font-family:Manrope,'Segoe UI',Arial,sans-serif;">
                      <div style="border-top:1px solid #e4e4e7;padding-top:16px;">
                        <p style="margin:0;font-size:12px;line-height:1.5;color:#71717a;">Maresi · Abidjan</p>
                        <p style="margin:6px 0 0;font-size:12px;line-height:1.5;color:#a1a1aa;">Message automatique. Pour une question sur un séjour, écrivez à l’hôte dans l’application.</p>
                      </div>
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
