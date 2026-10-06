package com.ducvm.omrserver.dataset;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GradingConfig {
	/**
	 * Exam id.
	 */
	private Long examId;
	/**
	 * Allow partial points.
	 */
	private boolean partial = true;
	/**
	 * Answer sheet base64 bytes.
	 */
	private FileData answerSheet;


	@Getter
	@Setter
	public static class FileData {
		private String bytes;
	}
}
