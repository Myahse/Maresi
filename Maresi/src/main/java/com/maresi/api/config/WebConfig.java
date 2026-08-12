package com.maresi.api.config;

import java.nio.file.Path;
import java.nio.file.Paths;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

  private final AppProperties props;

  public WebConfig(AppProperties props) {
    this.props = props;
  }

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/**").allowedOriginPatterns("*").allowCredentials(true).allowedMethods("*");
  }

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    String dir = props.getUploadDir();
    Path uploadPath = Paths.get(dir).toAbsolutePath().normalize();
    registry.addResourceHandler("/" + dir + "/**").addResourceLocations("file:" + uploadPath + "/");
  }
}
