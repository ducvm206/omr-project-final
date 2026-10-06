package com.ducvm.omrserver.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

	@Bean
	public SecurityFilterChain securityFilterChain(
			HttpSecurity http) throws Exception {

		http
				.csrf(csrf -> csrf.disable())
				.cors(Customizer.withDefaults())
				.authorizeHttpRequests(auth -> auth
						.requestMatchers("/api/login", "/api/register")
						.permitAll()

						.anyRequest()
						.authenticated()
				)

				.logout(logout -> logout
						.logoutUrl("/api/logout")
						.logoutSuccessHandler((request, response, authentication) -> {
							response.setStatus(HttpServletResponse.SC_OK);
						})
				);

		return http.build();
	}

	@Bean
	public CorsConfigurationSource corsConfigurationSource() {

		CorsConfiguration configuration =
				new CorsConfiguration();

		configuration.setAllowedOrigins(
				List.of("http://localhost:5173" , "http://localhost:3000")
		);

		configuration.setAllowedMethods(
				List.of(
						"GET",
						"POST",
						"PUT",
						"DELETE",
						"PATCH",
						"OPTIONS"
				)
		);

		configuration.setAllowedHeaders(
				List.of("*")
		);

		configuration.setAllowCredentials(true);

		UrlBasedCorsConfigurationSource source =
				new UrlBasedCorsConfigurationSource();

		source.registerCorsConfiguration(
				"/**",
				configuration
		);

		return source;
	}

	@Bean
	public AuthenticationManager authenticationManager(
			AuthenticationConfiguration configuration)
			throws Exception {

		return configuration.getAuthenticationManager();
	}

	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}
}
