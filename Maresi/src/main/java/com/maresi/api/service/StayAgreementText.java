package com.maresi.api.service;

import java.net.URI;
import java.util.UUID;

public final class StayAgreementText {
  private StayAgreementText() {}

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
