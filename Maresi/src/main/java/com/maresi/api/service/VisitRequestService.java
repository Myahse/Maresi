package com.maresi.api.service;

import com.maresi.api.business.VisitRequestBusiness;
import com.maresi.api.contracts.Request;
import com.maresi.api.contracts.Response;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class VisitRequestService {
  private final VisitRequestBusiness visitRequestBusiness;

  public VisitRequestService(VisitRequestBusiness visitRequestBusiness) {
    this.visitRequestBusiness = visitRequestBusiness;
  }

  public Response<Map<String, Object>> create(Request<Map<String, Object>> request, Locale locale) {
    return visitRequestBusiness.create(request, locale);
  }

  public Response<Map<String, Object>> listMine(Locale locale) {
    return visitRequestBusiness.listMine(locale);
  }

  public Response<Map<String, Object>> getOne(UUID id, Locale locale) {
    return visitRequestBusiness.getOne(id, locale);
  }

  public Response<Map<String, Object>> listForOwner(Locale locale) {
    return visitRequestBusiness.listForOwner(locale);
  }

  public Response<Map<String, Object>> updateStatus(
      UUID id, Request<Map<String, Object>> request, Locale locale) {
    return visitRequestBusiness.updateStatus(id, request, locale);
  }

  public Response<Map<String, Object>> signAgreement(
      UUID id, Request<Map<String, Object>> request, Locale locale) {
    return visitRequestBusiness.signAgreement(id, request, locale);
  }

  public Response<Map<String, Object>> confirmKey(
      UUID id, Request<Map<String, Object>> request, Locale locale) {
    return visitRequestBusiness.confirmKey(id, request, locale);
  }

  public Response<Map<String, Object>> requestExtension(
      UUID id, Request<Map<String, Object>> request, Locale locale) {
    return visitRequestBusiness.requestExtension(id, request, locale);
  }

  public Response<Map<String, Object>> decideExtension(
      UUID id, Request<Map<String, Object>> request, Locale locale) {
    return visitRequestBusiness.decideExtension(id, request, locale);
  }

  public Response<Map<String, Object>> markExtensionPaid(UUID id, Locale locale) {
    return visitRequestBusiness.markExtensionPaid(id, locale);
  }

  public Response<Map<String, Object>> confirmExtensionPayment(UUID id, Locale locale) {
    return visitRequestBusiness.confirmExtensionPayment(id, locale);
  }

  public Response<Map<String, Object>> billOverstay(
      UUID id, Request<Map<String, Object>> request, Locale locale) {
    return visitRequestBusiness.billOverstay(id, request, locale);
  }

  public Response<Map<String, Object>> closeStay(
      UUID id, Request<Map<String, Object>> request, Locale locale) {
    return visitRequestBusiness.closeStay(id, request, locale);
  }

  public com.maresi.api.service.FileStorageService.StoredMedia loadRequesterIdentity(UUID id, String kind) {
    return visitRequestBusiness.loadRequesterIdentity(id, kind);
  }
}
