package com.ducvm.omrserver.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Grading result for a student's exam.
 */
@Entity
@IdClass(GradingResultId.class)
@Table(name = "grading_results")
@Getter
@Setter
@NoArgsConstructor
public class GradingResult {

	/**
	 * Student identifier (part of composite PK).
	 */
	@Id
	@Column(name = "student_id", nullable = false)
	private String studentId;

	/**
	 * Exam identifier (part of composite PK).
	 */
	@Id
	@Column(name = "exam_id", nullable = false)
	private Long examId;

	/**
	 * Answer key used for grading.
	 */
	@Column(name = "key_used", nullable = false)
	private String keyUsed;

	/**
	 * Number of correct MCQ answers.
	 */
	@Column(name = "mcq_correct", nullable = false)
	private Integer mcqCorrect;

	/**
	 * Number of partially correct MCQ answers.
	 */
	@Column(name = "mcq_partial", nullable = false)
	private Integer mcqPartial;

	/**
	 * Number of incorrect MCQ answers.
	 */
	@Column(name = "mcq_incorrect", nullable = false)
	private Integer mcqIncorrect;

	/**
	 * Number of blank MCQ answers.
	 */
	@Column(name = "mcq_blank", nullable = false)
	private Integer mcqBlank;

	/**
	 * Total points earned from MCQ section.
	 */
	@Column(name = "mcq_points", nullable = false)
	private Double mcqPoints;

	/**
	 * Number of correct written answers.
	 */
	@Column(name = "written_correct", nullable = false)
	private Integer writtenCorrect;

	/**
	 * Number of incorrect written answers.
	 */
	@Column(name = "written_incorrect", nullable = false)
	private Integer writtenIncorrect;

	/**
	 * Number of blank written answers.
	 */
	@Column(name = "written_blank", nullable = false)
	private Integer writtenBlank;

	/**
	 * Total points earned from written section.
	 */
	@Column(name = "written_points", nullable = false)
	private Double writtenPoints;

	/**
	 * Total points earned overall.
	 */
	@Column(name = "total_points", nullable = false)
	private Double totalPoints;

	/**
	 * Percentage score.
	 */
	@Column(name = "percentage", nullable = false)
	private Double percentage;

	/**
	 * Letter grade awarded.
	 */
	@Column(name = "grade", nullable = false)
	private String grade;

	/**
	 * Exam this result belongs to.
	 */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "exam_id", insertable = false, updatable = false)
	private Exam exam;

	/**
	 * Student this result belongs to.
	 */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "student_id", insertable = false, updatable = false)
	private Student student;

	/**
	 * Question results for this grading result.
	 */
	@OneToMany(mappedBy = "gradingResult", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<QuestionResult> questionResults = new ArrayList<>();

	/**
	 * Graded time.
	 */
	@Column(name = "graded_at")
	private LocalDateTime gradedAt;

	@PrePersist
	protected void onCreate() {
		gradedAt = LocalDateTime.now();
	}
}