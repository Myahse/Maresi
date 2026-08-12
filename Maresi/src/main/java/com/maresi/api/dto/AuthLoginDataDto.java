package com.maresi.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Données de connexion")
public class AuthLoginDataDto {
  @Schema(example = "client@example.com")
  private String email;

  @Schema(example = "secret12")
  private String password;

  @Schema(example = "client", allowableValues = {"client", "owner"})
  private String role;

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getPassword() {
    return password;
  }

  public void setPassword(String password) {
    this.password = password;
  }

  public String getRole() {
    return role;
  }

  public void setRole(String role) {
    this.role = role;
  }
}
