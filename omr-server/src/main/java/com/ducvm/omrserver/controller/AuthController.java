package com.ducvm.omrserver.controller;

import com.ducvm.omrserver.dataset.LoginDS;
import com.ducvm.omrserver.dataset.RegisterDS;
import com.ducvm.omrserver.entity.User;
import com.ducvm.omrserver.service.LoginService;
import com.ducvm.omrserver.service.RegisterService;
import com.ducvm.omrserver.validator.UserValidator;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.Map;

@Controller
@RequestMapping("/api")
@Slf4j
public class AuthController {
	/**
	 * Login service.
	 */
	@Autowired
	private LoginService loginService;
	/**
	 * Register service.
	 */
	@Autowired
	private RegisterService registerService;
	/**
	 * User validator.
	 */
	@Autowired
	private UserValidator userValidator;

	/**
	 * Login user.
	 * @param ds LoginDS
	 * @return ResponseEntity
	 */
	@PostMapping("/login")
	public ResponseEntity<?> login(@RequestBody LoginDS ds, HttpServletRequest request, HttpServletResponse response) {
		Map<String, String> errors = userValidator.validate(ds);

		if (!errors.isEmpty()) {
			return ResponseEntity.badRequest().body(errors);
		}

		try {
			loginService.login(ds.getUserName(), ds.getPassword(), request, response);
			return ResponseEntity.ok().build();
		} catch (BadCredentialsException e) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
					.body(Map.of("authError", "Invalid username or password"));
		}
	}

	/**
	 * Log out the current user.
	 * Invalidates the HTTP session and clears the security context.
	 *
	 * @param request HttpServletRequest
	 * @return ResponseEntity
	 */
	@PostMapping("/logout")
	public ResponseEntity<?> logout(HttpServletRequest request) {
		HttpSession session = request.getSession(false);
		if (session != null) {
			session.invalidate();
		}

		SecurityContextHolder.clearContext();

		log.info("User logged out successfully");

		return ResponseEntity.ok().build();
	}

	/**
	 * Register new user.
	 * @param ds RegisterDS
	 * @return OK 200
	 */
	@PostMapping("/register")
	public ResponseEntity<?> register(@RequestBody RegisterDS ds) {
		Map<String, String> errors = userValidator.validate(ds);
		if (!errors.isEmpty()) {
			return ResponseEntity.badRequest().body(errors);
		}

		try {
			User user = registerService.register(ds);
			if (user == null) {
				return ResponseEntity.badRequest().body(errors);
			}
			return ResponseEntity.ok().build();
		} catch (Exception e) {
			return ResponseEntity.badRequest().body(e.getMessage());
		}
	}
}
