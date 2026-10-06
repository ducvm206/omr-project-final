package com.ducvm.omrserver.security;

import com.ducvm.omrserver.entity.User;
import com.ducvm.omrserver.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

	@Autowired
	private UserRepository userRepository;

	public CustomUserDetailsService(
			final UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	@Override
	public UserDetails loadUserByUsername(
			final String username)
			throws UsernameNotFoundException {

		User user = userRepository
				.findByUserName(username)
				.orElseThrow(() ->
						new UsernameNotFoundException("User not found"));

		return new CustomUserDetails(user);
	}
}
