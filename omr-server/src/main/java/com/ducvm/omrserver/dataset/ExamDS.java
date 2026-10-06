package com.ducvm.omrserver.dataset;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ExamDS {
	/**
	 * Id of exam.
	 */
	private Long id;
	/**
	 * Id of used template.
	 */
	private Long templateId;
	/**
	 * Id of course.
	 */
	private Long courseId;
	/**
	 * Name of the exam.
	 */
	private String name;
	/**
	 * Total points for MCQ section.
	 */
	private Double mcqPoints;
	/**
	 * Total points for written section.
	 */
	private Double writtenPoints;
	/**
	 * Combined total points.
	 */
	private Double totalPoints;
	/**
	 * Number of answer keys.
	 */
	private Integer noOfKeys;
	/**
	 * Grade A threshold.
	 */
	private Double gradeAThreshold;
	/**
	 * Grade B threshold.
	 */
	private Double gradeBThreshold;
	/**
	 * Grade C threshold.
	 */
	private Double gradeCThreshold;
	/**
	 * Grade D threshold.
	 */
	private Double gradeDThreshold;
}
