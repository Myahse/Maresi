package com.maresi.api.contracts;

import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class FunctionalError {
  private final StatusMessages messages;

  public FunctionalError(StatusMessages messages) {
    this.messages = messages;
  }

  public Status success(String message, Locale locale) {
    Status status = new Status();
    status.setCode(StatusCode.SUCCESS);
    status.setMessage(msg("StatusMessage.SUCCESS", locale) + ": " + message);
    return status;
  }

  public Status authFail(String message, Locale locale) {
    Status status = new Status();
    status.setCode(StatusCode.FUNC_AUTH_FAIL);
    status.setMessage(msg("StatusMessage.FUNC_AUTH_FAIL", locale) + ": " + message);
    return status;
  }

  public Status dataNotExist(String message, Locale locale) {
    Status status = new Status();
    status.setCode(StatusCode.FUNC_DATA_NOT_EXIST);
    status.setMessage(msg("StatusMessage.FUNC_DATA_NOT_EXIST", locale) + ": " + message);
    return status;
  }

  public Status dataExist(String message, Locale locale) {
    Status status = new Status();
    status.setCode(StatusCode.FUNC_DATA_EXIST);
    status.setMessage(msg("StatusMessage.FUNC_DATA_EXIST", locale) + ": " + message);
    return status;
  }

  public Status fieldEmpty(String message, Locale locale) {
    Status status = new Status();
    status.setCode(StatusCode.FUNC_FIELD_EMPTY);
    status.setMessage(msg("StatusMessage.FUNC_FIELD_EMPTY", locale) + ": " + message);
    return status;
  }

  public Status loginFail(Locale locale) {
    Status status = new Status();
    status.setCode(StatusCode.FUNC_LOGIN_FAIL);
    status.setMessage(msg("StatusMessage.FUNC_LOGIN_FAIL", locale));
    return status;
  }

  public Status disallowed(String message, Locale locale) {
    Status status = new Status();
    status.setCode(StatusCode.FUNC_DISALLOWED_OPERATION);
    status.setMessage(msg("StatusMessage.FUNC_DISALLOWED_OPERATION", locale) + ": " + message);
    return status;
  }

  public Status dataNotFound(String message, Locale locale) {
    Status status = new Status();
    status.setCode(StatusCode.FUNC_DATA_NOT_FOUND);
    status.setMessage(msg("StatusMessage.FUNC_DATA_NOT_FOUND", locale) + ": " + message);
    return status;
  }

  public Status invalidData(String message, Locale locale) {
    Status status = new Status();
    status.setCode(StatusCode.FUNC_INVALID_DATA);
    status.setMessage(msg("StatusMessage.FUNC_INVALID_DATA", locale) + ": " + message);
    return status;
  }

  public Status custom(String message, Locale locale) {
    Status status = new Status();
    status.setCode(StatusCode.FUNC_CUSTOM);
    status.setMessage(msg("StatusMessage.FUNC_CUSTOM", locale) + message);
    return status;
  }

  public Status accessDenied(String message, Locale locale) {
    Status status = new Status();
    status.setCode(StatusCode.FUNC_DISALLOWED_OPERATION);
    status.setMessage(msg("StatusMessage.ACCESS_DENIED", locale) + " : " + message);
    return status;
  }

  private String msg(String key, Locale locale) {
    return messages.get(key, locale != null ? locale : Locale.FRENCH);
  }
}
