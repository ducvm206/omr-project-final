package com.ducvm.omrserver.util;

import com.ducvm.omrserver.entity.User;
import com.ducvm.omrserver.security.CustomUserDetails;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class Utils {

	public static User getCurrentUser() {

		Authentication auth = SecurityContextHolder.getContext().getAuthentication();

		if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof CustomUserDetails details)) {
			throw new IllegalStateException("No authenticated user");
		}

		return details.getUser();

	}

	public static Double getMedianOfArray(List<Double> list) {
		if (list == null || list.isEmpty()) {
			return null; // Or throw new IllegalArgumentException("List cannot be null or empty");
		}

		// 1. Create a copy to prevent modifying the original list
		List<Double> sortedList = new ArrayList<>(list);

		// 2. Sort the list in ascending order
		Collections.sort(sortedList);

		int size = sortedList.size();
		int middle = size / 2;

		// 3. Calculate the median based on list length
		if (size % 2 == 1) {
			// Odd number of elements: take the middle one
			return sortedList.get(middle);
		} else {
			// Even number of elements: average the two middle elements
			return (sortedList.get(middle - 1) + sortedList.get(middle)) / 2.0;
		}
	}
}
