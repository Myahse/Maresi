package com.maresi.api.service;

import com.maresi.api.business.UserBusiness;
import com.maresi.api.contracts.Response;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class UserService {
  private final UserBusiness userBusiness;

  public UserService(UserBusiness userBusiness) {
    this.userBusiness = userBusiness;
  }

  public Response<Map<String, Object>> me(Locale locale) {
    return userBusiness.me(locale);
  }

  public FileStorageService.StoredMedia loadIdentity(UUID userId, String kind) {
    return userBusiness.loadIdentity(userId, kind);
  }
}
