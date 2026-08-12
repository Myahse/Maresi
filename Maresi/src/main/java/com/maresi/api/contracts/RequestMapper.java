package com.maresi.api.contracts;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class RequestMapper {
  private final ObjectMapper objectMapper;

  public RequestMapper(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public Request<Map<String, Object>> toMapRequest(Request<?> source) {
    Request<Map<String, Object>> target = new Request<>();
    target.setPage(source != null ? source.getPage() : null);
    target.setSize(source != null ? source.getSize() : null);
    if (source != null && source.getData() != null) {
      target.setData(objectMapper.convertValue(source.getData(), new TypeReference<Map<String, Object>>() {}));
    }
    return target;
  }
}
