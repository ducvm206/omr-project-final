package com.ducvm.omrserver.service;

import com.ducvm.omrserver.client.OmrEngineClient;
import com.ducvm.omrserver.dataset.ExamConfig;
import com.ducvm.omrserver.entity.Course;
import com.ducvm.omrserver.entity.Exam;
import com.ducvm.omrserver.entity.Template;
import com.ducvm.omrserver.enums.ExamCreationMode;
import com.ducvm.omrserver.repository.CourseRepository;
import com.ducvm.omrserver.repository.ExamRepository;
import com.ducvm.omrserver.repository.TemplateRepository;

import jakarta.transaction.Transactional;

import lombok.NonNull;
import lombok.extern.slf4j.Slf4j;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;

@Service
@Slf4j
public class ExamService {

	@Autowired
	private ExamRepository examRepository;

	@Autowired
	private TemplateRepository templateRepository;

	@Autowired
	private CourseRepository courseRepository;

	@Autowired
	private ObjectMapper objectMapper;

	@Autowired
	private OmrEngineClient client;

	/**
	 * Find exam by ID.
	 *
	 * @param id Exam ID.
	 * @return Exam, or null if not found.
	 * @throws Exception if a server error occurs.
	 */
	public Exam findById(Long id) throws Exception {
		try {
			return examRepository.findById(id).orElse(null);
		} catch (Exception e) {
			throw new Exception("Internal server error", e);
		}
	}

	/**
	 * Create an exam using the OMR Engine.
	 *
	 * @param config Exam creation configuration.
	 * @return Saved exam.
	 */
	@Transactional
	public Exam createExam(@NonNull ExamConfig config) {
		String mode = config.getMode();

		log.info("Creating exam in mode: {}", mode);

		// 1. Validate creation mode
		if (!ExamCreationMode.MANUAL.getValue().equals(mode)
				&& !ExamCreationMode.EXTRACT.getValue().equals(mode)) {
			throw new IllegalArgumentException(
					"Invalid mode: " + mode
							+ ". Must be 'manual' or 'extraction'"
			);
		}

		// 2. Find template
		Template template = templateRepository.findById(config.getTemplateId())
				.orElseThrow(() -> new IllegalArgumentException(
						"Template not found with ID: " + config.getTemplateId()
				));

		template.setLastUsedAt(LocalDateTime.now());

		// 3. Find course
		Course course = courseRepository.findById(config.getCourseId())
				.orElseThrow(() -> new IllegalArgumentException(
						"Course not found with ID: " + config.getCourseId()
				));

		// 4. Call OMR Engine
		JsonNode root;

		if (ExamCreationMode.MANUAL.getValue().equals(mode)) {
			root = client.createManualExam(config);
		} else {
			root = client.createExtractionExam(config);
		}

		// 5. Validate engine response
		boolean success = root.path("success").asBoolean();

		if (!success) {
			String error = root.path("error").asText("Unknown error");
			throw new IllegalStateException(
					"OMR Engine error: " + error
			);
		}

		// 6. Extract exam data
		JsonNode examData = root.path("exam_data");

		if (examData.isMissingNode() || examData.isNull()) {
			throw new IllegalStateException(
					"Exam data missing in response"
			);
		}

		// 7. Convert JSON data to string and save exam
		try {
			String examJson = objectMapper.writeValueAsString(examData);

			Exam exam = new Exam();

			exam.setName(config.getName());
			exam.setMcqPoints(config.getMcqPoints());
			exam.setWrittenPoints(config.getWrittenPoints());
			exam.setTotalPoints(
					config.getMcqPoints() + config.getWrittenPoints()
			);
			exam.setNoOfKeys(config.getNumberOfKeys());
			exam.setExamJson(examJson);

			exam.setGradeAThreshold(config.getGradeAThreshold());
			exam.setGradeBThreshold(config.getGradeBThreshold());
			exam.setGradeCThreshold(config.getGradeCThreshold());
			exam.setGradeDThreshold(config.getGradeDThreshold());

			exam.setTemplate(template);
			exam.setCourse(course);

			Exam savedExam = examRepository.save(exam);

			log.info("Exam saved with ID: {}", savedExam.getId());

			return savedExam;

		} catch (JacksonException e) {
			throw new IllegalStateException(
					"Failed to serialize OMR Engine exam data",
					e
			);
		}
	}

	/**
	 * Delete an exam.
	 *
	 * @param id Exam ID.
	 */
	public void deleteExam(Long id) {
		try {
			examRepository.deleteById(id);
			log.info("Exam deleted with ID: {}", id);
		} catch (Exception e) {
			throw new IllegalStateException(
					"Failed to delete exam with ID: " + id,
					e
			);
		}
	}
}
