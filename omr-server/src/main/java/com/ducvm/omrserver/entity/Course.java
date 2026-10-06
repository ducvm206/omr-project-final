package com.ducvm.omrserver.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

/**
 * Course entity.
 */
@Entity
@Table(name = "courses")
@Getter
@Setter
@NoArgsConstructor
public class Course {
	/**
	 * Course id.
	 */
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	/**
	 * Course name.
	 */
	@Column(nullable = false)
	private String name;
	/**
	 * Course academic year.
	 */
	@Column(nullable = false)
	private String academicYear;
	/**
	 * Course description.
	 */
	@Column(nullable = false)
	private String description;
	/**
	 * Course students.
	 */
	@ManyToMany
	@JoinTable(name = "course_students",
			joinColumns = @JoinColumn(name = "course_id", foreignKey = @ForeignKey(name = "fk_course_students_course")),
			inverseJoinColumns = @JoinColumn(name = "student_id", foreignKey = @ForeignKey(name = "fk_course_students_student"))
	)
	private Set<Student> students = new HashSet<>();
	/**
	 * Course owner.
	 */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "owner_id", nullable = false,
			foreignKey = @ForeignKey(name = "fk_courses_owner"))
	private User owner;

}
