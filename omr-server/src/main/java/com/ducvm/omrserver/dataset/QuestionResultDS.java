package com.ducvm.omrserver.dataset;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class QuestionResultDS {
	/**
	 * Question number in the exam.
	 */
	private Integer questionNumber;

	/**
	 * Type of question (MCQ/WRITTEN).
	 */
	private String questionType;

	/**
	 * Student's submitted answer.
	 */
	private String studentAnswer;

	/**
	 * Correct answer for the question.
	 */
	private String correctAnswer;

	/**
	 * Points earned for this question.
	 */
	private Double pointsEarned;

	/**
	 * Maximum points available.
	 */
	private Double pointsMax;

	/**
	 * Whether the answer is fully correct.
	 */
	private Boolean isCorrect;

	/**
	 * Whether the answer is partially correct.
	 */
	private Boolean isPartial;
}
