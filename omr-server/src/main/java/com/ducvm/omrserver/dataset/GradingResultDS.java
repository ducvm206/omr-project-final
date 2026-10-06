package com.ducvm.omrserver.dataset;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class GradingResultDS {
	/**
	 * Student identifier (part of composite PK).
	 */
	private String studentId;

	/**
	 * Exam identifier (part of composite PK).
	 */
	private Long examId;

	/**
	 * Answer key used for grading.
	 */
	private String keyUsed;

	/**
	 * Number of correct MCQ answers.
	 */
	private Integer mcqCorrect;

	/**
	 * Number of partially correct MCQ answers.
	 */
	private Integer mcqPartial;

	/**
	 * Number of incorrect MCQ answers.
	 */
	private Integer mcqIncorrect;

	/**
	 * Number of blank MCQ answers.
	 */
	private Integer mcqBlank;

	/**
	 * Total points earned from MCQ section.
	 */
	private Double mcqPoints;

	/**
	 * Number of correct written answers.
	 */
	private Integer writtenCorrect;

	/**
	 * Number of incorrect written answers.
	 */
	private Integer writtenIncorrect;

	/**
	 * Number of blank written answers.
	 */
	private Integer writtenBlank;

	/**
	 * Total points earned from written section.
	 */
	private Double writtenPoints;

	/**
	 * Total points earned overall.
	 */
	private Double totalPoints;

	/**
	 * Percentage score.
	 */
	private Double percentage;

	/**
	 * Letter grade awarded.
	 */
	private String grade;

	/**
	 * List of question results.
	 */
	private List<QuestionResultDS> questionResults;

	/**
	 * Annotation image base64.
	 */
	private String annotatedImage;

}
