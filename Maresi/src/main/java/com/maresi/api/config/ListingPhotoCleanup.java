package com.maresi.api.config;

import com.maresi.api.repository.PropertyRepository;
import com.maresi.api.service.FileStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class ListingPhotoCleanup {
  private static final Logger log = LoggerFactory.getLogger(ListingPhotoCleanup.class);
  private final FileStorageService fileStorage;
  private final PropertyRepository properties;

  public ListingPhotoCleanup(FileStorageService fileStorage, PropertyRepository properties) {
    this.fileStorage = fileStorage;
    this.properties = properties;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void sweepOrphans() {
    Thread sweep = new Thread(() -> {
      try {
        Thread.sleep(8_000);
        log.info("Starting leftover listing photo sweep");
        fileStorage.deleteUnreferencedPropertyImages(properties.allImageUrls());
      } catch (Exception e) {
        log.warn("Listing photo sweep skipped: {}", e.getMessage());
      }
    }, "listing-photo-sweep");
    sweep.setDaemon(true);
    sweep.start();
  }
}
