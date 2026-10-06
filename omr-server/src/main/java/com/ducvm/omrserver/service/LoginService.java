package com.ducvm.omrserver.service;

import com.ducvm.omrserver.entity.User;
import com.ducvm.omrserver.util.Utils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class LoginService {
	/**
	 * Auth manager.
	 */
	@Autowired
	private AuthenticationManager authManager;

	private final SecurityContextRepository securityContextRepository =
			new HttpSessionSecurityContextRepository();

	public void login(String userName, String password, HttpServletRequest request, HttpServletResponse response) {
		Authentication auth = authManager.authenticate(
				new UsernamePasswordAuthenticationToken(userName, password)
		);

		SecurityContext context = SecurityContextHolder.createEmptyContext();
		context.setAuthentication(auth);
		SecurityContextHolder.setContext(context);
		securityContextRepository.saveContext(context, request, response);

		User user = Utils.getCurrentUser();
		log.info("---------------------------");
		log.info("User '{}' logged in successfully", user.getUserName());
		log.info("User ID: '{}'", user.getId());
		log.info("---------------------------");
	}
}
