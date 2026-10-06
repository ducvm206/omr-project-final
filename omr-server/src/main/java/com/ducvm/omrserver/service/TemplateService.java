package com.ducvm.omrserver.service;

import com.ducvm.omrserver.client.OmrEngineClient;
import com.ducvm.omrserver.dataset.SearchForm;
import com.ducvm.omrserver.dataset.TemplateConfig;
import com.ducvm.omrserver.dataset.TemplateDS;
import com.ducvm.omrserver.entity.Template;
import com.ducvm.omrserver.entity.User;
import com.ducvm.omrserver.mapper.TemplateMapper;
import com.ducvm.omrserver.repository.TemplateRepository;
import com.ducvm.omrserver.util.Utils;

import jakarta.transaction.Transactional;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Slf4j
public class TemplateService {

	@Autowired
	private TemplateRepository templateRepository;

	@Autowired
	private TemplateMapper templateMapper;

	@Autowired
	private ObjectMapper objectMapper;

	@Autowired
	private OmrEngineClient client;

	/**
	 * Find template by ID.
	 *
	 * @param id Template ID.
	 * @return Template, or null if not found.
	 */
	public Template findById(Long id) {
		return templateRepository.findById(id).orElse(null);
	}

	/**
	 * Search templates owned by the current user.
	 *
	 * @param form Search form.
	 * @return List of template DTOs.
	 * @throws Exception if a server error occurs.
	 */
	public List<TemplateDS> search(SearchForm form) throws Exception {
		Map<String, String> params = form.getSearchParams();
		String name = params != null ? params.get("name") : null;

		User user = Utils.getCurrentUser();

		try {
			List<Template> templates =
					templateRepository.search(user.getId(), name);

			return templateMapper.toDtoList(templates);

		} catch (Exception e) {
			log.error("Failed to search templates", e);
			throw new Exception("Internal server error", e);
		}
	}

	/**
	 * Create a new template through the OMR Engine.
	 *
	 * @param req Template creation request.
	 * @return Saved template.
	 * @throws Exception if template creation or persistence fails.
	 */
	@Transactional
	public Template createTemplate(TemplateConfig req) throws Exception {
		User user = Utils.getCurrentUser();

		// 1. Call OMR Engine
		JsonNode root = client.createTemplate(req);

		// 2. Validate engine response
		boolean success = root.path("success").asBoolean();

		if (!success) {
			String error = root.path("error").asText("Unknown error");
			throw new IllegalStateException("OMR Engine error: " + error);
		}

		// 3. Extract template data
		JsonNode templateData = root.path("templateData");

		if (templateData.isMissingNode() || templateData.isNull()) {
			throw new IllegalStateException(
					"templateData is missing in response"
			);
		}

		// 4. Convert JSON data to string
		String templateJson;

		try {
			templateJson = objectMapper.writeValueAsString(templateData);
		} catch (JacksonException e) {
			throw new IllegalStateException(
					"Failed to serialize template data",
					e
			);
		}

		// 5. Extract generated file
		String fileBase64 = root.path("fileBase64").asText();

		if (fileBase64.isBlank()) {
			throw new IllegalStateException(
					"fileBase64 is missing or empty in response"
			);
		}

		byte[] fileBytes;

		try {
			fileBytes = Base64.getDecoder().decode(fileBase64);
		} catch (IllegalArgumentException e) {
			throw new IllegalStateException(
					"Invalid Base64 file data from OMR Engine",
					e
			);
		}

		// 6. Create template entity
		Template template = new Template();

		template.setName(req.getName());
		template.setMcqQuestions(req.getMcqQuestions());
		template.setWrittenQuestions(req.getWrittenQuestions());
		template.setHasKeyArea(req.isHasKeyArea());
		template.setHasStudentIdArea(req.isHasStudentIdArea());
		template.setTemplateJson(templateJson);
		template.setFileBytes(fileBytes);
		template.setOwner(user);

		// 7. Save template
		Template savedTemplate = templateRepository.save(template);

		log.info("Template created with ID: {}, name: {}",
				savedTemplate.getId(),
				savedTemplate.getName());

		log.info(
				"Template info: {} MCQ questions, {} written questions",
				savedTemplate.getMcqQuestions(),
				savedTemplate.getWrittenQuestions()
		);

		return savedTemplate;
	}

	/**
	 * Delete a template.
	 *
	 * @param id Template ID.
	 * @throws Exception if the template does not exist or deletion fails.
	 */
	public void deleteTemplate(Long id) throws Exception {
		Optional<Template> opt = templateRepository.findById(id);

		if (opt.isEmpty()) {
			throw new IllegalArgumentException(
					"Template not found with ID: " + id
			);
		}

		try {
			templateRepository.delete(opt.get());
			log.info("Template deleted with ID: {}", id);

		} catch (Exception e) {
			log.error("Failed to delete template with ID: {}", id, e);
			throw new Exception(
					"Failed to delete template with ID: " + id,
					e
			);
		}
	}
}