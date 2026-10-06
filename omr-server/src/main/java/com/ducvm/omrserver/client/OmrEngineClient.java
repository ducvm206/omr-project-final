package com.ducvm.omrserver.client;

import com.ducvm.omrserver.dataset.ExamConfig;
import com.ducvm.omrserver.dataset.GradingConfig;
import com.ducvm.omrserver.dataset.TemplateConfig;
import com.ducvm.omrserver.util.SettingManager;

import jakarta.annotation.PostConstruct;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import tools.jackson.databind.JsonNode;

@Slf4j
@Component
public class OmrEngineClient {

	@Autowired
	private RestTemplate restTemplate;

	@Autowired
	private SettingManager settingManager;

	private String baseUrl;

	@PostConstruct
	public void init() {
		this.baseUrl = "http://" + settingManager.getEngineHost()
				+ ":" + settingManager.getEnginePort();

		log.info("OMR Engine initialized at: {}", baseUrl);
	}

	public JsonNode createTemplate(TemplateConfig config) {
		return post("/eg/template", config);
	}

	public JsonNode createManualExam(ExamConfig config) {
		return post("/eg/exam/manual", config);
	}

	public JsonNode createExtractionExam(ExamConfig config) {
		return post("/eg/exam/extraction", config);
	}

	public JsonNode grade(GradingConfig config) {
		return post("/eg/grade", config);
	}

	private JsonNode post(String endpoint, Object request) {
		long start = System.nanoTime();
		String url = baseUrl + endpoint;

		log.debug("Calling OMR Engine: {}", url);

		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.APPLICATION_JSON);

		HttpEntity<Object> entity = new HttpEntity<>(request, headers);

		try {
			JsonNode response = restTemplate.postForObject(
					url,
					entity,
					JsonNode.class
			);

			if (response == null || response.isNull()) {
				throw new OmrEngineException(
						"Empty response from OMR Engine"
				);
			}

			return response;

		} catch (RestClientException e) {
			log.error("OMR Engine request failed: {}", endpoint, e);

			throw new OmrEngineException(
					"Failed to communicate with OMR Engine: "
							+ e.getMessage(),
					e
			);
		} finally {
			long duration = (System.nanoTime() - start) / 1_000_000;
			log.debug(
					"OMR Engine request completed in {}ms",
					duration
			);
		}
	}
}
