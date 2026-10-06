
package com.ducvm.omrserver.config;

import org.apache.hc.client5.http.config.ConnectionConfig;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManager;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.core5.util.Timeout;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class RestTemplateConfig {

	@Bean
	public RestTemplate restTemplate() {

		// Connection timeout
		ConnectionConfig connectionConfig = ConnectionConfig.custom()
				.setConnectTimeout(Timeout.ofSeconds(5))
				.build();

		// Connection pool
		PoolingHttpClientConnectionManager connectionManager =
				PoolingHttpClientConnectionManagerBuilder.create()
						.setMaxConnTotal(50)
						.setMaxConnPerRoute(20)
						.setDefaultConnectionConfig(connectionConfig)
						.build();

		// Request timeouts
		RequestConfig requestConfig = RequestConfig.custom()
				.setConnectionRequestTimeout(Timeout.ofSeconds(10))
				.setResponseTimeout(Timeout.ofSeconds(60))
				.build();

		// HTTP client
		CloseableHttpClient httpClient = HttpClients.custom()
				.setConnectionManager(connectionManager)
				.setDefaultRequestConfig(requestConfig)
				.evictExpiredConnections()
				.build();

		// Spring request factory
		HttpComponentsClientHttpRequestFactory factory =
				new HttpComponentsClientHttpRequestFactory(httpClient);

		return new RestTemplate(factory);
	}
}
