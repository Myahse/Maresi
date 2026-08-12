package com.maresi.api.business;

import com.maresi.api.contracts.FunctionalError;
import com.maresi.api.contracts.Response;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class HealthBusiness {
  private final FunctionalError functionalError;

  public HealthBusiness(FunctionalError functionalError) {
    this.functionalError = functionalError;
  }

  public Response<Map<String, Object>> health(Locale locale) {
    Response<Map<String, Object>> response = new Response<>();
    response.setItem(Map.of("ok", true));
    response.setStatus(functionalError.success("Health", locale));
    return response;
  }
}
