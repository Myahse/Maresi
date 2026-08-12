package com.maresi.api.security;

import com.maresi.api.exception.ApiException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {
  private SecurityUtils() {}

  public static AuthUser requireUser() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null && auth.getPrincipal() instanceof AuthUser user) {
      return user;
    }
    throw ApiException.of(401, "Authentication required");
  }

  public static AuthUser currentUserOrNull() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null && auth.getPrincipal() instanceof AuthUser user) {
      return user;
    }
    return null;
  }
}
