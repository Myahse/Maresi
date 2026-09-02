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
          SecurityContextHolder.clearContext();
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
        SecurityContextHolder.clearContext();
      }
    }
    chain.doFilter(request, response);
  }
}
