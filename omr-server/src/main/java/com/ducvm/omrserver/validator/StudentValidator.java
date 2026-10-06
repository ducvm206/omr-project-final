package com.ducvm.omrserver.validator;

import com.ducvm.omrserver.dataset.StudentDS;
import com.ducvm.omrserver.util.Constants;
import lombok.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.Map;

@Component
public class StudentValidator {

	public Map<String, String> validate(@NonNull StudentDS ds) {
		Map<String, String> errors = new HashMap<>();
		validateId(ds.getId(), errors);
		validateName(ds.getName(), errors);
		return errors;
	}

	private void validateId(String id, Map<String, String> errors) {
		if (id == null || id.trim().isEmpty()) {
			errors.put("id", "Student ID is required");
		} else if (id.length() != Constants.STUDENT_ID_LENGTH) {
			errors.put("id", "Student ID length should be " + Constants.STUDENT_ID_LENGTH + " characters");
		} else if (!id.matches(Constants.STUDENT_ID_REGEX)) {
			errors.put("id", "Student ID should only contains digits from 0 to 9w");
		}
	}

	private void validateName(String name, Map<String, String> errors) {
		if (name == null || name.trim().isEmpty()) {
			errors.put("name", "Student name is required");
		}
	}
}
