package com.ducvm.omrserver.service;

import com.ducvm.omrserver.client.OmrEngineClient;
import com.ducvm.omrserver.dataset.GradingConfig;
import com.ducvm.omrserver.dataset.GradingResultDS;
import com.ducvm.omrserver.entity.*;
import com.ducvm.omrserver.enums.QuestionType;
import com.ducvm.omrserver.mapper.GradingResultMapper;
import com.ducvm.omrserver.repository.ExamRepository;
import com.ducvm.omrserver.repository.GradingResultRepository;
import com.ducvm.omrserver.repository.StudentRepository;

import lombok.NonNull;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tools.jackson.databind.JsonNode;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Grading service.
 */
@Slf4j
@Service
public class GradingService {

	@Autowired
	private GradingResultRepository gradingResultRepo;

	@Autowired
	private ExamRepository examRepository;

	@Autowired
	private StudentRepository studentRepository;

	@Autowired
	private OmrEngineClient client;

	@Autowired
	private GradingResultMapper gradingResultMapper;

	/**
	 * Execute grading and save the result.
	 *
	 * @param config Grading configuration.
	 * @return Grading result DTO.
	 */
	@Transactional
	public GradingResultDS grade(@NonNull GradingConfig config) {
		log.info("Starting grading for exam: {}", config.getExamId());

		JsonNode root = client.grade(config);

		return processGradingResult(root, config);
	}

	/**
	 * Process the OMR Engine response and persist the grading result.
	 *
	 * @param root OMR Engine response.
	 * @param config Grading configuration.
	 * @return Grading result DTO.
	 */
	private GradingResultDS processGradingResult(
			JsonNode root,
			GradingConfig config
	) {
		if (root == null || root.isNull()) {
			throw new IllegalStateException(
					"Empty response from OMR Engine"
			);
		}

		// 1. Check engine success
		if (!root.path("success").asBoolean()) {
			String error = root.path("error").asText("Unknown error");
			throw new IllegalStateException(
					"OMR Engine failed: " + error
			);
		}

		// 2. Extract response data
		JsonNode data = root.path("data");

		if (data.isMissingNode() || data.isNull() || !data.isObject()) {
			throw new IllegalStateException(
					"Invalid or missing grading data"
			);
		}

		String studentId = getString(data, "student_id");
		Long examId = getLong(data, "exam_id");
		String keyUsed = getString(data, "key_used");

		if (studentId == null || studentId.isBlank()) {
			throw new IllegalStateException(
					"Student ID missing in grading response"
			);
		}

		if (examId == null) {
			throw new IllegalStateException(
					"Exam ID missing in grading response"
			);
		}

		int mcqCorrect = getInt(data, "mcq_correct");
		int mcqPartial = getInt(data, "mcq_partial");
		int mcqIncorrect = getInt(data, "mcq_incorrect");
		int mcqBlank = getInt(data, "mcq_blank");

		int writtenCorrect = getInt(data, "written_correct");
		int writtenIncorrect = getInt(data, "written_incorrect");
		int writtenBlank = getInt(data, "written_blank");

		String gradedAt = getString(data, "graded_at");
		String annotatedImage = getString(data, "annotated_image");

		// 3. Fetch exam and student
		Exam exam = examRepository.findByIdWithTemplate(examId)
				.orElseThrow(() -> new IllegalArgumentException(
						"Exam not found with ID: " + examId
				));

		Student student = studentRepository.findById(studentId)
				.orElseThrow(() -> new IllegalArgumentException(
						"Student not found with ID: " + studentId
				));

		// 4. Check enrollment
		boolean isEnrolled =
				examRepository.isStudentInExam(examId, studentId);

		if (!isEnrolled) {
			throw new IllegalArgumentException(
					"Student with ID: " + studentId
							+ " is not enrolled in this exam"
			);
		}

		Template template = exam.getTemplate();

		// 5. Calculate points per question
		int mcqCount = template.getMcqQuestions() != null
				? template.getMcqQuestions()
				: 0;

		int writtenCount = template.getWrittenQuestions() != null
				? template.getWrittenQuestions()
				: 0;

		double ptsPerMcq = mcqCount > 0
				? exam.getMcqPoints() / (double) mcqCount
				: 0.0;

		double ptsPerWritten = writtenCount > 0
				? exam.getWrittenPoints() / (double) writtenCount
				: 0.0;

		// 6. Calculate earned points
		double mcqEarnedPoints =
				(ptsPerMcq * mcqCorrect)
						+ (ptsPerMcq * mcqPartial * 0.5);

		double writtenEarnedPoints =
				ptsPerWritten * writtenCorrect;

		double totalPoints =
				mcqEarnedPoints + writtenEarnedPoints;

		// 7. Calculate percentage and grade
		double maxPoints =
				exam.getMcqPoints() + exam.getWrittenPoints();

		double percentage = maxPoints > 0
				? (totalPoints / maxPoints) * 100
				: 0.0;

		String grade = calculateGrade(percentage, exam);

		// 8. Create grading result
		GradingResult result = new GradingResult();

		result.setStudentId(studentId);
		result.setStudent(student);

		result.setExamId(examId);
		result.setExam(exam);

		result.setKeyUsed(keyUsed);

		result.setMcqCorrect(mcqCorrect);
		result.setMcqPartial(mcqPartial);
		result.setMcqIncorrect(mcqIncorrect);
		result.setMcqBlank(mcqBlank);
		result.setMcqPoints(mcqEarnedPoints);

		result.setWrittenCorrect(writtenCorrect);
		result.setWrittenIncorrect(writtenIncorrect);
		result.setWrittenBlank(writtenBlank);
		result.setWrittenPoints(writtenEarnedPoints);

		result.setTotalPoints(totalPoints);
		result.setPercentage(percentage);
		result.setGrade(grade);

		if (gradedAt != null && !gradedAt.isBlank()) {
			result.setGradedAt(LocalDateTime.parse(gradedAt));
		}

		// 9. Process individual question results
		JsonNode qResults = data.path("question_results");

		List<QuestionResult> questionResults = new ArrayList<>();

		if (qResults.isArray()) {
			for (JsonNode q : qResults) {
				questionResults.add(
						buildQuestionResult(
								q,
								studentId,
								examId,
								result,
								ptsPerMcq,
								ptsPerWritten
						)
				);
			}
		}

		result.setQuestionResults(questionResults);

		// 10. Save result
		GradingResult savedResult =
				gradingResultRepo.save(result);

		log.info(
				"Grading result saved for student {} and exam {}",
				studentId,
				examId
		);

		// 11. Convert to DTO
		return gradingResultMapper.toDSWithAnnotatedImage(
				savedResult,
				annotatedImage
		);
	}

	/**
	 * Build a question result entity.
	 */
	private QuestionResult buildQuestionResult(
			JsonNode q,
			String studentId,
			Long examId,
			GradingResult result,
			double ptsPerMcq,
			double ptsPerWritten
	) {
		int qNum = q.path("questionNumber").asInt();
		String qType = getString(q, "questionType");
		String studentAns = getString(q, "studentAnswer");
		String correctAns = getString(q, "correctAnswer");

		boolean isCorrect = q.path("isCorrect").asBoolean();
		boolean isPartial = q.path("isPartial").asBoolean();

		double earnedPts;

		if (QuestionType.MCQ.getType().equals(qType)) {
			earnedPts = isCorrect
					? ptsPerMcq
					: (isPartial ? ptsPerMcq * 0.5 : 0.0);

		} else if (QuestionType.WRITTEN.getType().equals(qType)) {
			earnedPts = isCorrect ? ptsPerWritten : 0.0;

		} else {
			earnedPts = 0.0;
		}

		double maxPts = QuestionType.MCQ.getType().equals(qType)
				? ptsPerMcq
				: ptsPerWritten;

		QuestionResult qResult = new QuestionResult();

		qResult.setStudentId(studentId);
		qResult.setExamId(examId);
		qResult.setQuestionNumber(qNum);
		qResult.setQuestionType(qType);
		qResult.setStudentAnswer(studentAns);
		qResult.setCorrectAnswer(correctAns);
		qResult.setPointsEarned(earnedPts);
		qResult.setPointsMax(maxPts);
		qResult.setIsCorrect(isCorrect);
		qResult.setIsPartial(isPartial);
		qResult.setGradingResult(result);

		return qResult;
	}

	/**
	 * Calculate letter grade based on percentage and exam thresholds.
	 */
	private String calculateGrade(double percentage, Exam exam) {
		if (percentage >= exam.getGradeAThreshold()) {
			return "A";
		}

		if (percentage >= exam.getGradeBThreshold()) {
			return "B";
		}

		if (percentage >= exam.getGradeCThreshold()) {
			return "C";
		}

		if (percentage >= exam.getGradeDThreshold()) {
			return "D";
		}

		return "F";
	}

	// JSON helper methods

	private String getString(JsonNode node, String field) {
		JsonNode value = node.path(field);

		return value.isMissingNode() || value.isNull()
				? null
				: value.asText();
	}

	private Long getLong(JsonNode node, String field) {
		JsonNode value = node.path(field);

		return value.isMissingNode() || value.isNull()
				? null
				: value.asLong();
	}

	private int getInt(JsonNode node, String field) {
		JsonNode value = node.path(field);

		return value.isMissingNode() || value.isNull()
				? 0
				: value.asInt();
	}
}
