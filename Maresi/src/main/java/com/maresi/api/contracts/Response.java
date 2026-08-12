package com.maresi.api.contracts;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import java.util.List;

@JsonInclude(Include.NON_NULL)
public class Response<T> extends ResponseBase {
  private List<T> items;
  private T item;

  public List<T> getItems() {
    return items;
  }

  public void setItems(List<T> items) {
    this.items = items;
  }

  public T getItem() {
    return item;
  }

  public void setItem(T item) {
    this.item = item;
  }
}
