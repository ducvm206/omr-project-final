package com.ducvm.omrserver.repository;

import com.ducvm.omrserver.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
	/**
	 * Find user by username.
	 * @param username String
	 * @return user
	 */
	Optional<User> findByUserName(String username);

}
