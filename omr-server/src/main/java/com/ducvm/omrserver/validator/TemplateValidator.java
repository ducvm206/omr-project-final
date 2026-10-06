package com.ducvm.omrserver.validator;

import com.ducvm.omrserver.dataset.TemplateConfig;
import com.ducvm.omrserver.util.Constants;
import lombok.NonNull;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class TemplateValidator {

	public Map<String, String> validate(@NonNull TemplateConfig req) {
		Map<String, String> errors = new HashMap<>();
		validateMcqCount(req.getMcqQuestions(), errors);
		validateWrittenCount(req.getWrittenQuestions(), errors);
		return errors;
	}

	private	void validateMcqCount(Integer mcqCount, Map<String, String> errors) {
		if (mcqCount == null) {
			errors.put("mcq", "MCQ count must not be null");
		} else if (mcqCount < 1 || mcqCount > Constants.MAX_MCQ_COUNT) {
			errors.put("mcq", "MCQ count must be between 1 and " + Constants.MAX_MCQ_COUNT);
		}
	}

	private	void validateWrittenCount(Integer mcqCount, Map<String, String> errors) {
		if (mcqCount == null) {
			errors.put("written", "Written count must not be null");
		} else if (mcqCount < 1 || mcqCount > Constants.MAX_WRITTEN_COUNT) {
			errors.put("written", "Written count must be between 1 and " + Constants.MAX_WRITTEN_COUNT);
		}
	}
}
