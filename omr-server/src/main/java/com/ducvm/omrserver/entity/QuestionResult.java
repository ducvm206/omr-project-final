package com.ducvm.omrserver.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Individual question result for a student's exam.
 */
@Entity
@Table(name = "question_results")
@Getter
@Setter
@NoArgsConstructor
public class QuestionResult {

	/**
	 * Unique identifier.
	 */
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/**
	 * Student identifier.
	 */
	@Column(name = "student_id", nullable = false)
	private String studentId;

	/**
	 * Exam identifier.
	 */
	@Column(name = "exam_id", nullable = false)
	private Long examId;

	/**
	 * Question number in the exam.
	 */
	@Column(name = "question_number", nullable = false)
	private Integer questionNumber;

	/**
	 * Type of question (MCQ/WRITTEN).
	 */
	@Column(name = "question_type", nullable = false)
	private String questionType;

	/**
	 * Student's submitted answer.
	 */
	@Column(name = "student_answer", nullable = false)
	private String studentAnswer;

	/**
	 * Correct answer for the question.
	 */
	@Column(name = "correct_answer", nullable = false)
	private String correctAnswer;

	/**
	 * Points earned for this question.
	 */
	@Column(name = "points_earned", nullable = false)
	private Double pointsEarned;

	/**
	 * Maximum points available.
	 */
	@Column(name = "points_max", nullable = false)
	private Double pointsMax;

	/**
	 * Whether the answer is fully correct.
	 */
	@Column(name = "is_correct", nullable = false)
	private Boolean isCorrect;

	/**
	 * Whether the answer is partially correct.
	 */
	@Column(name = "is_partial", nullable = false)
	private Boolean isPartial;

	/**
	 * Grading result this question belongs to.
	 */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumns({
			@JoinColumn(name = "student_id", referencedColumnName = "student_id",
					insertable = false, updatable = false),
			@JoinColumn(name = "exam_id", referencedColumnName = "exam_id",
					insertable = false, updatable = false)
	})
	private GradingResult gradingResult;
}