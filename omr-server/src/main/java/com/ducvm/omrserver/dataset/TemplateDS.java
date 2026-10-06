package com.ducvm.omrserver.dataset;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class TemplateDS {
	/**
	 * Template id.
	 */
	private Long id;
	/**
	 * Owner id.
	 */
	private Long ownerId;
	/**
	 * Template name.
	 */
	private String name;
	/**
	 * Number of MCQ questions.
	 */
	private Integer mcqQuestions;
	/**
	 * Number of written questions.
	 */
	private Integer writtenQuestions;
	/**
	 * Whether the template has a key area.
	 */
	private Boolean hasKeyArea;
	/**
	 * Whether the template has a student ID area.
	 */
	private Boolean hasStudentIdArea;
	/**
	 * Creation timestamp.
	 */
	private LocalDateTime createdAt;
	/**
	 * Last used timestamp.
	 */
	private LocalDateTime lastUsedAt;
}
