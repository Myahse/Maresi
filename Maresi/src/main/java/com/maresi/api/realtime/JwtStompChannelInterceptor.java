package com.maresi.api.realtime;

import com.maresi.api.repository.UserRepository;
import com.maresi.api.security.AuthUser;
import com.maresi.api.security.JwtService;
import java.util.List;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

@Component
public class JwtStompChannelInterceptor implements ChannelInterceptor {
  private final JwtService jwtService;
  private final UserRepository users;

  public JwtStompChannelInterceptor(JwtService jwtService, UserRepository users) {
    this.jwtService = jwtService;
    this.users = users;
  }

  @Override
  public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
    StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
    if (accessor == null || !StompCommand.CONNECT.equals(accessor.getCommand())) {
      return message;
    }
    String raw = firstHeader(accessor, "Authorization", "authorization", "token");
    if (raw == null || raw.isBlank()) {
      return message;
    }
    String token = raw.startsWith("Bearer ") ? raw.substring(7).trim() : raw.trim();
    try {
      AuthUser parsed = jwtService.parse(token);
      var db = users.findById(parsed.id());
      if (db.isEmpty()) {
        return message;
      }
      String role = String.valueOf(db.get().getOrDefault("role", parsed.role()));
      if (role.isBlank() || "null".equals(role)) role = "client";
      String email =
          db.get().get("email") == null ? parsed.email() : String.valueOf(db.get().get("email"));
      AuthUser user = new AuthUser(parsed.id(), email, role);
      var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()));
      var auth = new UsernamePasswordAuthenticationToken(user, null, authorities);
      accessor.setUser(new StompUserPrincipal(user.id().toString(), auth));
    } catch (Exception ignored) {
      // handshake stays anonymous; broker destinations stay unusable without a user
    }
    return message;
  }

  private static String firstHeader(StompHeaderAccessor accessor, String... names) {
    for (String name : names) {
      String v = accessor.getFirstNativeHeader(name);
      if (v != null && !v.isBlank()) return v;
    }
    return null;
  }
}
