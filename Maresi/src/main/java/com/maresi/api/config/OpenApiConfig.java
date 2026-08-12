package com.maresi.api.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

  @Bean
  public OpenAPI maresiOpenApi(@Value("${server.port:4000}") int port) {
    return new OpenAPI()
        .info(
            new Info()
                .title("Maresi API")
                .description(
                    "API de la plateforme Maresi (annonces de résidences).\n\n"
                        + "Les réponses utilisent l'enveloppe Peya : `hasError`, `status`, `item`, `items`.\n"
                        + "Corps JSON requis : `{ \"data\": { ... } }`.\n"
                        + "Authentification JWT via **Authorize** (token obtenu sur `/api/auth/login`).")
                .version("1.0.0")
                .contact(new Contact().name("Maresi").email("support@maresi.local")))
        .addServersItem(new Server().url("http://localhost:" + port).description("Local"))
        .components(
            new Components()
                .addSecuritySchemes(
                    "bearerAuth",
                    new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")
                        .description("JWT Bearer token")));
  }
}
