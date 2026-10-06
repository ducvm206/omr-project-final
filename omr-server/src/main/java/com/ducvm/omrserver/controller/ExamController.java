package com.ducvm.omrserver.controller;

import com.ducvm.omrserver.dataset.ExamConfig;
import com.ducvm.omrserver.entity.Exam;
import com.ducvm.omrserver.service.ExamService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/api/exams")
public class ExamController {
	/**
	 * Exam service.
	 */
	@Autowired
	private ExamService examService;

	@PostMapping("/create")
	public ResponseEntity<?> createExam(@RequestBody ExamConfig config) {
		try {
			Exam exam = examService.createExam(config);
			if (exam == null) {
				return ResponseEntity.badRequest().body("Failed to create exam");
			}
			return ResponseEntity.ok().build();
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
		}
	}

	@PostMapping("/{id}/delete")
	public ResponseEntity<?> deleteExam(@PathVariable Long id) {
		try {
			examService.deleteExam(id);
			return ResponseEntity.ok().build();
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
		}
	}
}
