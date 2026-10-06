package com.ducvm.omrserver.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum ExamCreationMode {
	/**
	 * Manual mode.
	 */
	MANUAL("manual"),
	/**
	 * Extraction mode.
	 */
	EXTRACT("extraction");

	private final String value;
}