package com.ducvm.omrserver.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Student entity.
 */
@Entity
@Table(name = "students")
@Getter
@Setter
@NoArgsConstructor
public class Student {
	/**
	 * Student id.
	 */
	@Id
	private String id;
	/**
	 * Student name.
	 */
	@Column(nullable = false)
	private String name;
	/**
	 * Student owner.
	 */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "owner_id", nullable = false, foreignKey = @ForeignKey(name = "fk_students_owner"))
	private User owner;
}
