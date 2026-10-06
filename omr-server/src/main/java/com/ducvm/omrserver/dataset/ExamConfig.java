package com.ducvm.omrserver.dataset;

import lombok.Getter;
import lombok.Setter;

import java.util.Map;

/**
 * Exam config.
 */
@Getter
@Setter
public class ExamConfig {
	/**
	 * Creation mode. (manual, extraction)
	 */
	private String mode;
	/**
	 * Exam name.
	 */
	private String name;
	/**
	 * Course id.
	 */
	private Long courseId;
	/**
	 * Template id.
	 */
	private Long templateId;
	/**
	 * Number of keys.
	 */
	private Integer numberOfKeys;
	/**
	 * MCQ points.
	 */
	private Double mcqPoints;
	/**
	 * Written points.
	 */
	private Double writtenPoints;
	/**
	 * Grade thresholds.
	 */
	private Double gradeAThreshold;
	private Double gradeBThreshold;
	private Double gradeCThreshold;
	private Double gradeDThreshold;

	/**
	 * Manual key maps. ("1": ["A"], ...., "41": 2)
	 */
	private Map<String, Object> keyA;
	private Map<String, Object> keyB;
	private Map<String, Object> keyC;
	private Map<String, Object> keyD;
	private Map<String, Object> keyE;

	/**
	 * Extraction mode file bytes.
	 */
	private FileData keyAFile;
	private FileData keyBFile;
	private FileData keyCFile;
	private FileData keyDFile;
	private FileData keyEFile;

	@Getter
	@Setter
	public static class FileData {
		private String bytes;
	}

}
