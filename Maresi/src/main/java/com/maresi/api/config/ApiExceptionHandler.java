package com.maresi.api.config;

import com.maresi.api.contracts.Response;
import com.maresi.api.exception.ApiException;
import com.maresi.api.service.FunctionalRollbackException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import jakarta.servlet.http.HttpServletRequest;

@RestControllerAdvice
public class ApiExceptionHandler {
  private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

  @ExceptionHandler(ApiException.class)
  public ResponseEntity<Map<String, Object>> handleApi(ApiException ex) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("error", ex.getMessage());
    body.put("status", ex.getStatus());
    return ResponseEntity.status(ex.getStatus()).body(body);
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<Map<String, Object>> handleNotReadable(HttpMessageNotReadableException ex) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("status", HttpStatus.BAD_REQUEST.value());
    body.put("error", "Bad Request");
    body.put("message", "Corps JSON invalide. Utilisez { \"data\": { ... } }.");
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
  }

  @ExceptionHandler(MissingServletRequestParameterException.class)
  public ResponseEntity<Map<String, Object>> handleMissingParam(
      MissingServletRequestParameterException ex, HttpServletRequest request) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("timestamp", Instant.now().toString());
    body.put("status", HttpStatus.BAD_REQUEST.value());
    body.put("error", "Bad Request");
    body.put("path", request.getRequestURI());
    body.put("message", ex.getMessage());
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
  }

  @ExceptionHandler(FunctionalRollbackException.class)
  public ResponseEntity<Response<?>> handleFunctionalRollback(FunctionalRollbackException ex) {
    Response<?> body = ex.getResponse() instanceof Response<?> r ? r : null;
    HttpStatus status =
        body != null && body.isHasError() ? HttpStatus.BAD_REQUEST : HttpStatus.OK;
    return ResponseEntity.status(status).body(body);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<Map<String, Object>> handleUncaught(Exception ex, HttpServletRequest request) {
    log.error("Unhandled exception for {}", request.getRequestURI(), ex);
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("timestamp", Instant.now().toString());
    body.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
    body.put("error", "Internal Server Error");
    body.put("path", request.getRequestURI());
    String msg = ex.getMessage();
    body.put("message", msg != null && !msg.isEmpty() ? msg : ex.getClass().getSimpleName());
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
  }
}
