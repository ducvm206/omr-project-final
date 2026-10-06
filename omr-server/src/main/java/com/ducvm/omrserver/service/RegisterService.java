package com.ducvm.omrserver.service;

import com.ducvm.omrserver.dataset.RegisterDS;
import com.ducvm.omrserver.entity.User;
import com.ducvm.omrserver.repository.UserRepository;
import lombok.NonNull;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@Slf4j
public class RegisterService {
	/**
	 * User repository.
	 */
	@Autowired
	private UserRepository userRepository;
	/**
	 * Password encoder.
	 */
	@Autowired
	private PasswordEncoder passwordEncoder;

	/**
	 * Register a new user
	 * @param ds RegisterDS
	 * @return user
	 * @throws Exception user already exists
	 */
	public User register(@NonNull RegisterDS ds) throws Exception {
		Optional<User> opt = userRepository.findByUserName(ds.getUserName());
		if (opt.isPresent()) {
			throw new Exception("Username already in use");
		}

		User user = new User();
		user.setUserName(ds.getUserName());
		user.setFullName(ds.getFullName());
		user.setPassword(passwordEncoder.encode(ds.getPassword()));
		return userRepository.save(user);
	}
}
