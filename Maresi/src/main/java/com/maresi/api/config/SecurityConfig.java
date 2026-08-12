package com.maresi.api.config;

import com.maresi.api.config.AppProperties;
import com.maresi.api.security.JwtAuthFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

  private static final String[] PUBLIC_PATHS = {
    "/api/health",
    "/api/auth/**",
    "/api/webhooks/**",
    "/swagger-ui.html",
    "/swagger-ui/**",
    "/v3/api-docs",
    "/v3/api-docs/**",
    "/webjars/**",
    "/uploads/**"
  };

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(10);
  }

  @Bean
  SecurityFilterChain filterChain(HttpSecurity http, JwtAuthFilter jwtAuthFilter, AppProperties props)
      throws Exception {
    http.csrf(AbstractHttpConfigurer::disable)
        .httpBasic(AbstractHttpConfigurer::disable)
        .formLogin(AbstractHttpConfigurer::disable)
        .cors(Customizer.withDefaults())
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            auth ->
                auth.requestMatchers(PUBLIC_PATHS)
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/properties", "/api/properties/**")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .exceptionHandling(
            ex ->
                ex.authenticationEntryPoint(
                        (request, response, authException) -> writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED, "Authentication required"))
                    .accessDeniedHandler(
                        (request, response, accessDeniedException) -> writeJsonError(response, HttpServletResponse.SC_FORBIDDEN, "Access denied")))
        .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
    return http.build();
  }

  private static void writeJsonError(HttpServletResponse response, int status, String message)
      throws java.io.IOException {
    response.setStatus(status);
    response.setContentType("application/json");
    response.getWriter().write("{\"error\":\"" + message.replace("\"", "\\\"") + "\"}");
  }
}
