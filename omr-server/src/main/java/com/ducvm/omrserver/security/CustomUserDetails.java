package com.ducvm.omrserver.security;

import com.ducvm.omrserver.entity.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

/**
 * Custom user details for Spring Security.
 */
public class CustomUserDetails implements UserDetails {

	/**
	 * User entity.
	 */
	private final User user;

	/**
	 * Constructor.
	 *
	 * @param user user entity
	 */
	public CustomUserDetails(final User user) {
		this.user = user;
	}

	/**
	 * Get the underlying user entity.
	 *
	 * @return user
	 */
	public User getUser() {
		return user;
	}

	/**
	 * Get username used for authentication.
	 *
	 * @return username
	 */
	@Override
	public String getUsername() {
		return user.getUserName();
	}

	/**
	 * Get encrypted password.
	 *
	 * @return password
	 */
	@Override
	public String getPassword() {
		return user.getPassword();
	}

	/**
	 * Get user authorities.
	 *
	 * @return authorities
	 */
	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		return List.of();
	}

	/**
	 * Whether the account has expired.
	 *
	 * @return true
	 */
	@Override
	public boolean isAccountNonExpired() {
		return true;
	}

	/**
	 * Whether the account is locked.
	 *
	 * @return true
	 */
	@Override
	public boolean isAccountNonLocked() {
		return true;
	}

	/**
	 * Whether the credentials have expired.
	 *
	 * @return true
	 */
	@Override
	public boolean isCredentialsNonExpired() {
		return true;
	}

	/**
	 * Whether the account is enabled.
	 *
	 * @return true
	 */
	@Override
	public boolean isEnabled() {
		return true;
	}
}
