package com.ducvm.omrserver.validator;

import com.ducvm.omrserver.dataset.LoginDS;
import com.ducvm.omrserver.dataset.RegisterDS;
import com.ducvm.omrserver.dataset.UserDS;
import com.ducvm.omrserver.entity.User;
import com.ducvm.omrserver.util.Constants;
import lombok.NonNull;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class UserValidator {

	public Map<String, String> validate(@NonNull Object dataset) {
		Map<String, String> errors = new HashMap<>();
		if (dataset instanceof RegisterDS ds) {
            validateUserName(ds.getUserName(), errors);
			validateFullName(ds.getFullName(), errors);
			validatePassword(ds.getPassword(), errors);
		} else if (dataset instanceof LoginDS ds) {
            validateUserName(ds.getUserName(), errors);
			validatePassword(ds.getPassword(), errors);
		} else if (dataset instanceof UserDS ds) {
			validateUserName(ds.getUserName(), errors);
			validateFullName(ds.getFullName(), errors);
		} else {
			return Map.of("errors", "Undefined object");
		}

		return errors;
	}

	private	void validateUserName(String userName, Map<String, String> errors) {
		if (userName == null || userName.isEmpty()) {
			errors.put("userName", "Username is required");
		} else if (userName.length() < Constants.USERNAME_MIN_LENGTH || userName.length() > Constants.USERNAME_MAX_LENGTH) {
			errors.put("userName", "Username should be between 4 and 16 characters");
		} else if (!userName.matches(Constants.USERNAME_REGEX)) {
			errors.put("userName", "Username should only contain letters and numbers without spaces");
		}
	}

	private void validatePassword(String password, Map<String, String> errors) {
		if (password == null || password.isEmpty()) {
			errors.put("password", "Password is required");
		} else if (password.length() < Constants.PASSWORD_MIN_LENGTH || password.length() > Constants.PASSWORD_MAX_LENGTH) {
			errors.put("password", "Password should be between 8 and 32 characters");
		}
	}

	private	void validateFullName(String fullName, Map<String, String> errors) {
		if (fullName == null || fullName.isEmpty()) {
			errors.put("fullName", "Full name is required");
		} else if (!fullName.matches(Constants.FULLNAME_REGEX)) {
			errors.put("fullName", "Full name should only contain letters and spaces");
		}
	}


}


