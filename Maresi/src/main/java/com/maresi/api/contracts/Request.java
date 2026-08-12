package com.maresi.api.contracts;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@JsonInclude(Include.NON_NULL)
@Schema(description = "Enveloppe requête — le corps métier est dans `data`")
public class Request<T> extends RequestBase {
  private Integer page;
  private Integer size;

  @Schema(description = "Données métier")
  private T data;
  private List<T> datas;

  public Integer getPage() {
    return page;
  }

  public void setPage(Integer page) {
    this.page = page;
  }

  public Integer getSize() {
    return size;
  }

  public void setSize(Integer size) {
    this.size = size;
  }

  public T getData() {
    return data;
  }

  public void setData(T data) {
    this.data = data;
  }

  public List<T> getDatas() {
    return datas;
  }

  public void setDatas(List<T> datas) {
    this.datas = datas;
  }
}
