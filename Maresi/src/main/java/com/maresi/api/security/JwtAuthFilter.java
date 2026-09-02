package com.maresi.api.security;

import com.maresi.api.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

  private final JwtService jwtService;
  private final UserRepository users;

  public JwtAuthFilter(JwtService jwtService, UserRepository users) {
    this.jwtService = jwtService;
    this.users = users;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    String header = request.getHeader("Authorization");
    if (header != null && header.startsWith("Bearer ")) {
      String token = header.substring(7);
      try {
        AuthUser parsed = jwtService.parse(token);
        var db = users.findById(parsed.id());
        if (db.isEmpty()) {
          if (rejectInvalidSession(request, response)) {
            return;
          }
        } else {
          String role = String.valueOf(db.get().getOrDefault("role", parsed.role()));
          if (role.isBlank() || "null".equals(role)) role = "client";
          String email =
              db.get().get("email") == null ? parsed.email() : String.valueOf(db.get().get("email"));
          AuthUser user = new AuthUser(parsed.id(), email, role);
          var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()));
          var auth = new UsernamePasswordAuthenticationToken(user, null, authorities);
          SecurityContextHolder.getContext().setAuthentication(auth);
        }
      } catch (Exception ignored) {
        if (rejectInvalidSession(request, response)) {
          return;
        }
      }
    }
    chain.doFilter(request, response);
  }

  /** @return true when the response was written and the chain must stop */
  private boolean rejectInvalidSession(HttpServletRequest request, HttpServletResponse response) throws IOException {
    SecurityContextHolder.clearContext();
    if (allowAnonymousDespiteInvalidToken(request)) {
      return false;
    }
    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    response.setContentType("application/json");
    response.getWriter().write("{\"error\":\"Authentication required\"}");
    return true;
  }

  private static boolean allowAnonymousDespiteInvalidToken(HttpServletRequest request) {
    String uri = request.getRequestURI() == null ? "" : request.getRequestURI();
    return uri.contains("/api/auth/")
        || uri.contains("/api/webhooks/")
        || uri.contains("/api/health")
        || uri.contains("/api/media/")
        || uri.contains("/api/payments/confirm")
        || uri.contains("/swagger")
        || uri.contains("/v3/api-docs")
        || uri.contains("/ws");
  }
}
