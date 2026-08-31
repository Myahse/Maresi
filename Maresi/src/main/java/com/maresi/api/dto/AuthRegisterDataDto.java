package com.maresi.api.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Données d'inscription")
public class AuthRegisterDataDto {
  @Schema(example = "client@example.com")
  private String email;

  @Schema(example = "secret12")
  private String password;

  @JsonAlias("full_name")
  @Schema(example = "Jean Dupont")
  private String fullName;

  @Schema(example = "client", allowableValues = {"client", "owner", "host"})
  private String role;

  @Schema(example = "+2250700000000")
  private String phone;

  @JsonAlias({"idCard", "id_card"})
  @Schema(example = "CI123456789")
  private String idCard;

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

  public String getFullName() {
    return fullName;
  }

  public void setFullName(String fullName) {
    this.fullName = fullName;
  }

  public String getRole() {
    return role;
  }

  public void setRole(String role) {
    this.role = role;
  }

  public String getPhone() {
    return phone;
  }

  public void setPhone(String phone) {
    this.phone = phone;
  }

  public String getIdCard() {
    return idCard;
  }

  public void setIdCard(String idCard) {
    this.idCard = idCard;
  }
}
