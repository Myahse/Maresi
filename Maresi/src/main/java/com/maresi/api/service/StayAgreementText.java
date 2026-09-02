package com.maresi.api.service;

import java.net.URI;
import java.util.List;
import java.util.UUID;

public final class StayAgreementText {
  private StayAgreementText() {}

  public static List<String> articles() {
    return List.of(
        "Le client prend soin du logement, du mobilier, des clés et du matériel, et le laisse propre à la fin du séjour.",
        "Le client est responsable des dégâts qu’il cause et du coût de réparation ou de remplacement.",
        "Le règlement intérieur, les voisins, les heures de calme et le nombre d’occupants doivent être respectés.",
        "Aucune sous-location ni événement sans l’accord écrit de l’hôte.",
        "Un manquement peut entraîner l’annulation du séjour sans remboursement de la commission Maresi.");
  }

  public static String plainArticles() {
    StringBuilder text = new StringBuilder();
    List<String> items = articles();
    for (int i = 0; i < items.size(); i++) {
      if (i > 0) text.append('\n');
      text.append("Article ").append(i + 1).append(" — ").append(items.get(i));
    }
    return text.toString();
  }

  public static String pageUrl(String webOrigin, UUID visitId) {
    String base = origin(webOrigin);
    return base + "/visits/" + visitId + "/agreement";
  }

  public static String origin(String successOrPublicUrl) {
    if (successOrPublicUrl == null || successOrPublicUrl.isBlank()) {
      return "http://localhost:3000";
    }
    try {
      URI uri = URI.create(successOrPublicUrl.trim());
      if (uri.getScheme() == null || uri.getHost() == null) {
        return "http://localhost:3000";
      }
      int port = uri.getPort();
      return uri.getScheme() + "://" + uri.getHost() + (port > 0 ? ":" + port : "");
    } catch (Exception e) {
      return "http://localhost:3000";
    }
  }
}
