package com.ducvm.omrserver.config;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.reactive.function.client.WebClient;


@Configuration
public class WebClientConfig {

	@Bean
	public WebClient webClient() {
		return WebClient.builder()
				.codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
				.build();
	}

	@Bean
	public ObjectMapper objectMapper() {
		ObjectMapper mapper = new ObjectMapper();
		mapper.registerModule(new JavaTimeModule());
		mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
		mapper.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
		return mapper;
	}
}
