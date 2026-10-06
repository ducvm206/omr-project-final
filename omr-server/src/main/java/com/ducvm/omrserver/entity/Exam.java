package com.ducvm.omrserver.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Represents an exam belonging to a course.
 */
@Entity
@Table(name = "exams")
@Getter
@Setter
@NoArgsConstructor
public class Exam {
	/**
	 * Exam id.
	 */
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	/**
	 * Name of the exam.
	 */
	@Column(nullable = false)
	private String name;
	/**
	 * Total points for MCQ section.
	 */
	@Column(name = "mcq_points", nullable = false)
	private Double mcqPoints;
	/**
	 * Total points for written section.
	 */
	@Column(name = "written_points", nullable = false)
	private Double writtenPoints;
	/**
	 * Combined total points.
	 */
	@Column(name = "total_points", nullable = false)
	private Double totalPoints;
	/**
	 * Number of answer keys.
	 */
	@Column(name = "no_of_keys", nullable = false)
	private Integer noOfKeys;
	/**
	 * JSON configuration.
	 */
	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "exam_json", columnDefinition = "jsonb", nullable = false)
	private String examJson;
	/**
	 * Grade A threshold.
	 */
	@Column(name = "grade_a_threshold", nullable = false)
	private Double gradeAThreshold = 90.0;
	/**
	 * Grade B threshold.
	 */
	@Column(name = "grade_b_threshold", nullable = false)
	private Double gradeBThreshold = 75.0;
	/**
	 * Grade C threshold.
	 */
	@Column(name = "grade_c_threshold", nullable = false)
	private Double gradeCThreshold = 60.0;
	/**
	 * Grade D threshold.
	 */
	@Column(name = "grade_d_threshold", nullable = false)
	private Double gradeDThreshold = 45.0;
	/**
	 * Template reference.
	 */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "template_id", nullable = false,
			foreignKey = @ForeignKey(name = "fk_exams_template"))
	private Template template;
	/**
	 * Course reference.
	 */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "course_id", nullable = false,
			foreignKey = @ForeignKey(name = "fk_exams_course"))
	private Course course;
	/**
	 * Created at
	 */
	@Column(name = "created_at")
	private LocalDateTime createdAt;

	@PrePersist
	protected void onCreate() {
		createdAt = LocalDateTime.now();
	}

}
