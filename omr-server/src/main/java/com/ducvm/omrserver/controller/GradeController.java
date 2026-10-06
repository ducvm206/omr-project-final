package com.ducvm.omrserver.controller;

import com.ducvm.omrserver.dataset.GradingConfig;
import com.ducvm.omrserver.dataset.GradingResultDS;
import com.ducvm.omrserver.service.GradingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/api/grade")
public class GradeController {
	/**
	 * Grading service.
	 */
	@Autowired
	private GradingService gradingService;

	@PostMapping
	public ResponseEntity<?> grade(@RequestBody GradingConfig config) {
		try {
			GradingResultDS ds = gradingService.grade(config);
			return ResponseEntity.ok(ds);
		} catch (Exception e) {
			e.printStackTrace();
			return ResponseEntity.internalServerError()
					.body("Grading failed: " + e.getMessage());
		}
	}
}
