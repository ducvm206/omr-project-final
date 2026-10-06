package com.ducvm.omrserver.dataset;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterDS {
	/**
	 * Register username.
	 */
	private String userName;
	/**
	 * Full name.
	 */
	private String fullName;
	/**
	 * Register password.
	 */
	private String password;
}
