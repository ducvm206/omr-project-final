package com.ducvm.omrserver.service;

import com.ducvm.omrserver.dataset.UserDS;
import com.ducvm.omrserver.entity.User;
import com.ducvm.omrserver.repository.UserRepository;
import com.ducvm.omrserver.util.Utils;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@Slf4j
public class UserService {
	/**
	 * User repository.
	 */
	@Autowired
	private UserRepository userRepository;

	@Transactional
	public User updateUser(UserDS ds) throws Exception {
		User user = Utils.getCurrentUser();
		if (user == null) {
			throw new Exception("Not authenticated");
		}

		if (!user.getUserName().equals(ds.getUserName())) {
			Optional<User> existing = userRepository.findByUserName(ds.getUserName());
			if (existing.isPresent()) {
				throw new Exception("Username already in use");
			}
		}

		user.setUserName(ds.getUserName());
		user.setFullName(ds.getFullName());

		return userRepository.save(user);
	}
}
