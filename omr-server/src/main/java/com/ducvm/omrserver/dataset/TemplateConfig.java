package com.ducvm.omrserver.dataset;

import lombok.Getter;
import lombok.Setter;

/**
 * Template config.
 * <p>
 * Used as request body for OMR Engine server.
 * </p>
 */
@Getter
@Setter
public class TemplateConfig {

	private String name;

	private Integer mcqQuestions = 20;

	private Integer writtenQuestions = 3;

	private boolean hasKeyArea = true;

	private boolean hasStudentIdArea = true;
}
