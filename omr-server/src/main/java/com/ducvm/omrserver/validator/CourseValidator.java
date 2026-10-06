package com.ducvm.omrserver.validator;

import com.ducvm.omrserver.dataset.CourseDS;
import com.ducvm.omrserver.util.Constants;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class CourseValidator {

	public Map<String, String> validate(CourseDS ds) {
		Map<String, String> errors = new HashMap<String, String>();
		validateName(ds.getName(), errors);
		validateDescription(ds.getDescription(), errors);
		validateAcademicYear(ds.getAcademicYear(), errors);
		return errors;
	}

	private void validateName(String name, Map<String, String> errors) {
		if (name == null || name.isEmpty()) {
			errors.put("name", "Name cannot be empty");
		} else if (name.length() > Constants.COURSE_NAME_MAX_LENGTH) {
			errors.put("name", "Name should be less than " + Constants.COURSE_NAME_MAX_LENGTH);
		}
	}

	private void validateAcademicYear(String academicYear, Map<String, String> errors) {
		if (academicYear == null || academicYear.isEmpty()) {
			errors.put("academicYear", "Academic Year cannot be empty");
		} else if (!academicYear.matches(Constants.ACADEMIC_YEAR_REGEX)) {
			errors.put("academicYear", "Academic Year should be a valid year");
		}
	}

	private void validateDescription(String description, Map<String, String> errors) {
		if (description == null || description.isEmpty()) {
			errors.put("description", "Description cannot be empty");
		} else if (description.length() > Constants.COURSE_DESC_MAX_LENGTH) {
			errors.put("description", "Description should be less than " + Constants.COURSE_DESC_MAX_LENGTH);
		}
	}
}
