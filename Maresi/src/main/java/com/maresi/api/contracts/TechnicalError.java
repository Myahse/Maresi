package com.maresi.api.contracts;

import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class TechnicalError {
  private final StatusMessages messages;

  public TechnicalError(StatusMessages messages) {
    this.messages = messages;
  }

  public Status dbNotConnect(String message, Locale locale) {
    Status status = new Status();
    status.setCode(StatusCode.TECH_DB_NOT_CONNECT);
    status.setMessage(msg("StatusMessage.TECH_DB_NOT_CONNECT", locale) + ": " + message);
    return status;
  }

  public Status dbFail(String message, Locale locale) {
    Status status = new Status();
    status.setCode(StatusCode.TECH_DB_FAIL);
    status.setMessage(msg("StatusMessage.TECH_DB_FAIL", locale) + ": " + message);
    return status;
  }

  public Status internError(String message, Locale locale) {
    Status status = new Status();
    status.setCode(StatusCode.TECH_INTERN_ERROR);
    status.setMessage(msg("StatusMessage.TECH_INTERN_ERROR", locale) + ": " + message);
    return status;
  }

  public Status dbPermissionDenied(String message, Locale locale) {
    Status status = new Status();
    status.setCode(StatusCode.TECH_DB_PERMISSION_DENIED);
    status.setMessage(msg("StatusMessage.TECH_DB_PERMISSION_DENIED", locale) + ": " + message);
    return status;
  }

  public Status dbQueryRefused(String message, Locale locale) {
    Status status = new Status();
    status.setCode(StatusCode.TECH_DB_QUERY_REFUSED);
    status.setMessage(msg("StatusMessage.TECH_DB_QUERY_REFUSED", locale) + ": " + message);
    return status;
  }

  public Status error(String message, Locale locale) {
    Status status = new Status();
    status.setCode(StatusCode.FUNC_FAIL);
    status.setMessage(message);
    return status;
  }

  private String msg(String key, Locale locale) {
    return messages.get(key, locale != null ? locale : Locale.FRENCH);
  }
}
