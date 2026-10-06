package com.ducvm.omrserver.dataset;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CourseDS {
	/**
	 * Course id.
	 */
	private Long id;
	/**
	 * Course name.
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
}
