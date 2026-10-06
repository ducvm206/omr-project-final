package com.ducvm.omrserver.controller;

import com.ducvm.omrserver.dataset.UserDS;
import com.ducvm.omrserver.entity.User;
import com.ducvm.omrserver.service.UserService;
import com.ducvm.omrserver.util.Utils;
import com.ducvm.omrserver.validator.UserValidator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * User controller.
 */
@Controller
@RequestMapping("/api/me")
@Slf4j
public class UserController {
	/**
	 * User service.
	 */
	@Autowired
	private UserService userService;
	/**
	 * User validator.
	 */
	@Autowired
	private UserValidator userValidator;

	/**
	 * Return the currently authenticated user.
	 * Responds 401 when there is no authenticated user.
	 *
	 * @return ResponseEntity
	 */
	@GetMapping
	public ResponseEntity<?> me() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		if (auth == null || !auth.isAuthenticated()
				|| "anonymousUser".equals(auth.getPrincipal())) {
			return ResponseEntity.status(401).build();
		}

		User user;
		try {
			user = Utils.getCurrentUser();
		} catch (Exception e) {
			log.warn("Failed to resolve current user", e);
			return ResponseEntity.status(401).build();
		}

		if (user == null) {
			return ResponseEntity.status(401).build();
		}

		return ResponseEntity.ok(new UserResponse(user.getId(), user.getUserName(), user.getFullName()));
	}

	/**
	 * Response DTO for the current user.
	 * Excludes the password hash.
	 */
	public record UserResponse(Long id, String userName, String fullName) {
	}

	@PostMapping("/edit")
	public ResponseEntity<?> updateUser(@RequestBody UserDS ds) {
		Map<String, String> errors = userValidator.validate(ds);
		if (!errors.isEmpty()) {
			return ResponseEntity.badRequest().body(errors);
		}
		try {
			User user = userService.updateUser(ds);
			if (user != null) {
				return ResponseEntity.ok(new UserResponse(
						user.getId(),
						user.getUserName(),
						user.getFullName()
				));
			}
			return ResponseEntity.internalServerError().body("Internal Server Error");
		} catch (Exception e) {
			return ResponseEntity.internalServerError().body(e.getMessage());
		}
	}
}
