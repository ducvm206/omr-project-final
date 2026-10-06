package com.ducvm.omrserver.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * User entity.
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {
	/**
	 * User id.
	 */
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	/**
	 * Username.
	 */
	@Column(nullable = false, unique = true)
	private String userName;
	/**
	 * Full name.
	 */
	@Column(nullable = false)
	private String fullName;
	/**
	 * Password.
	 */
	@JsonIgnore
	@Column(nullable = false)
	private String password;

}
