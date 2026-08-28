package com.maresi.api.realtime;

import java.security.Principal;
import org.springframework.security.core.Authentication;

public final class StompUserPrincipal implements Principal {
  private final String name;
  private final Authentication authentication;

  public StompUserPrincipal(String name, Authentication authentication) {
    this.name = name;
    this.authentication = authentication;
  }

  @Override
  public String getName() {
    return name;
  }

  public Authentication getAuthentication() {
    return authentication;
  }
}
