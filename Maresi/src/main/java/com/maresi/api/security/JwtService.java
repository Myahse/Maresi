package com.maresi.api.security;

import com.maresi.api.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
  private final SecretKey key;
  private final Duration expiresIn;

  public JwtService(AppProperties props) {
    String secret = props.getJwt().getSecret();
    if (secret == null || secret.isBlank()) {
      secret = "maresi-dev-only-jwt-secret-not-for-production";
    }
    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.expiresIn = parseDuration(props.getJwt().getExpiresIn());
  }

  public String sign(UUID id, String email, String role, String phone) {
    Date now = new Date();
    Date exp = new Date(now.getTime() + expiresIn.toMillis());
    return Jwts.builder()
        .subject(id.toString())
        .claim("id", id.toString())
        .claim("email", email)
        .claim("role", role)
        .claim("phone", phone)
        .issuedAt(now)
        .expiration(exp)
        .signWith(key)
        .compact();
  }

  public AuthUser parse(String token) {
    Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    String id = claims.get("id", String.class);
    if (id == null) id = claims.getSubject();
    return new AuthUser(UUID.fromString(id), claims.get("email", String.class), claims.get("role", String.class));
  }

  private static Duration parseDuration(String raw) {
    if (raw == null || raw.isBlank()) return Duration.ofDays(7);
    raw = raw.trim().toLowerCase();
    if (raw.endsWith("d")) {
      return Duration.ofDays(Long.parseLong(raw.substring(0, raw.length() - 1)));
    }
    if (raw.endsWith("h")) {
      return Duration.ofHours(Long.parseLong(raw.substring(0, raw.length() - 1)));
    }
    return Duration.ofDays(7);
  }
}
