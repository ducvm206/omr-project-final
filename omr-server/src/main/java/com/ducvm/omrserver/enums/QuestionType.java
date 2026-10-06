package com.ducvm.omrserver.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum QuestionType {
	/**
	 * MCQ type.
	 */
	MCQ("MCQ"),
	/**
	 * Written type.
	 */
	WRITTEN("WRITTEN");

	private final String type;
}
