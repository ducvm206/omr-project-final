package com.ducvm.omrserver.dataset;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class StudentDetailsDS {
	/**
	 * Student name.
	 */
	private String name;
	/**
	 * Student id.
	 */
	private String id;
	/**
	 * Student courses.
	 */
	private List<CourseDS> courses;
	/**
	 * Student grading results.
	 */
	private List<GradingResultDS> gradingResults;
}
