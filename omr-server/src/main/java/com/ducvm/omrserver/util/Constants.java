package com.ducvm.omrserver.util;

public final class Constants {

	public static final String USERNAME_REGEX = "^[a-zA-Z0-9]+$";
	public static final Integer USERNAME_MAX_LENGTH = 16;
	public static final Integer USERNAME_MIN_LENGTH = 4;

	public static final String FULLNAME_REGEX = "^[a-zA-Z ]+$";

	public static final Integer PASSWORD_MIN_LENGTH = 8;
	public static final Integer PASSWORD_MAX_LENGTH = 32;

	public static final Integer STUDENT_ID_LENGTH = 8;
	public static final String STUDENT_ID_REGEX = "^[0-9]+$";

	public static final Integer DEFAULT_MCQ_COUNT = 20;
	public static final Integer DEFAULT_WRITTEN_COUNT = 3;
	public static final Integer MAX_MCQ_COUNT = 40;
	public static final Integer MAX_WRITTEN_COUNT = 6;

	public static final String ACADEMIC_YEAR_REGEX = "^(19|20)\\d{2}-(0\\d|1\\d|2\\d|3[0-7])$";
	public static final Integer COURSE_NAME_MAX_LENGTH = 32;
	public static final Integer COURSE_DESC_MAX_LENGTH = 255;

}
