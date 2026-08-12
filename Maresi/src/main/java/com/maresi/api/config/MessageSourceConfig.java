package com.maresi.api.config;

import java.util.Locale;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.i18n.FixedLocaleResolver;

@Configuration
public class MessageSourceConfig {

  @Bean
  LocaleResolver localeResolver() {
    FixedLocaleResolver resolver = new FixedLocaleResolver();
    resolver.setDefaultLocale(Locale.FRENCH);
    return resolver;
  }
}
