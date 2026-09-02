package com.maresi.api.service;

import java.net.URI;
import java.util.UUID;

public final class StayAgreementText {
  private StayAgreementText() {}

  public static String plainArticles() {
    return """
        Article 1 — Le client prend soin du logement, du mobilier, des clés et du matériel, et le laisse propre à la fin du séjour.
        Article 2 — Le client est responsable des dégâts qu’il cause et du coût de réparation ou de remplacement.
        Article 3 — Le règlement intérieur, les voisins, les heures de calme et le nombre d’occupants doivent être respectés.
        Article 4 — Aucune sous-location ni événement sans l’accord écrit de l’hôte.
        Article 5 — Un manquement peut entraîner l’annulation du séjour sans remboursement de la commission Maresi.
        """
        .trim();
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
