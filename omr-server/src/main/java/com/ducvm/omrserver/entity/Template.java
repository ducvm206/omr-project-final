package com.ducvm.omrserver.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

/**
 * Template entity.
 */
@Entity
@Table(name = "templates")
@Getter
@Setter
@NoArgsConstructor
public class Template {
	/**
	 * Template id.
	 */
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	/**
	 * Template name.
	 */
	@Column(nullable = false)
	private String name;
	/**
	 * Number of MCQ questions.
	 */
	@Column(name = "mcq_questions", nullable = false)
	private Integer mcqQuestions;
	/**
	 * Number of written questions.
	 */
	@Column(name = "written_questions", nullable = false)
	private Integer writtenQuestions;
	/**
	 * Whether the template has a key area.
	 */
	@Column(name = "has_key_area", nullable = false)
	private Boolean hasKeyArea;
	/**
	 * Whether the template has a student ID area.
	 */
	@Column(name = "has_student_id_area", nullable = false)
	private Boolean hasStudentIdArea;
	/**
	 * Template JSON configuration.
	 */
	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "template_json", columnDefinition = "jsonb", nullable = false)
	private String templateJson;
	/**
	 * Template file bytes.
	 */
	@Column(name = "file_bytes", nullable = false)
	private byte[] fileBytes;
	/**
	 * Creation timestamp.
	 */
	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;
	/**
	 * Last used timestamp.
	 */
	@Column(name = "last_used_at")
	private LocalDateTime lastUsedAt;
	/**
	 * Template owner (User who owns this template).
	 */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "owner_id", nullable = false, foreignKey = @ForeignKey(name = "fk_templates_owner"))
	private User owner;
	/**
	 * Lifecycle callback to set creation timestamp before persist.
	 */
	@PrePersist
	protected void onCreate() {
		createdAt = LocalDateTime.now();
	}
}
