package com.ducvm.omrserver.dataset;

import lombok.Getter;
import lombok.Setter;
import java.util.List;

@Getter
@Setter
public class CourseDetailDS {
	/**
	 * Course name
	 */
	private String name;
	/**
	 * Course academic year.
	 */
	private String academicYear;
	/**
	 * Course description.
	 */
	private String description;
	/**
	 * Course students.
	 */
	private List<StudentDS> students;
	/**
	 * Results per student.
	 */
	private List<StudentResultDS> studentResults;
	/**
	 * Results per exam.
	 */
	private List<ExamResultDS> examResults;

	@Getter
	@Setter
	public static class StudentResultDS {
		private String id;
		private String name;
		private List<GradingResultDS> gradingResults;
	}
}
