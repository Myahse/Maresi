package com.maresi.api.service;

import com.maresi.api.business.HealthBusiness;
import com.maresi.api.contracts.Response;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class HealthService {
  private final HealthBusiness healthBusiness;

  public HealthService(HealthBusiness healthBusiness) {
    this.healthBusiness = healthBusiness;
  }

  public Response<Map<String, Object>> health(Locale locale) {
    return healthBusiness.health(locale);
  }
}
