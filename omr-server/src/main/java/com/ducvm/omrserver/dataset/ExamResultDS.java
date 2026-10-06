package com.ducvm.omrserver.dataset;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class ExamResultDS {
	/**
	 * Exam id.
	 */
	private Long id;
	/**
	 * Name of the exam.
	 */
	private String name;
	/**
	 * Number of answer keys.
	 */
	private Integer noOfKeys;
	/**
	 * List of grading results.
	 */
	private List<GradingResultDS> gradingResults;
	/**
	 * Average score.
	 */
	private Double averageScore;
	/**
	 * Median score.
	 */
	private Double medianScore;
}
