package com.ducvm.omrserver.controller;

import com.ducvm.omrserver.dataset.GradingResultDS;
import com.ducvm.omrserver.dataset.SearchForm;
import com.ducvm.omrserver.dataset.StudentDS;
import com.ducvm.omrserver.dataset.StudentDetailsDS;
import com.ducvm.omrserver.entity.Exam;
import com.ducvm.omrserver.entity.Student;
import com.ducvm.omrserver.service.ExamService;
import com.ducvm.omrserver.service.StudentService;
import com.ducvm.omrserver.validator.StudentValidator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/api/students")
public class StudentController {
	/**
	 * Student service.
	 */
	@Autowired
	private StudentService studentService;
	/**
	 * Student validator.
	 */
	@Autowired
	private StudentValidator studentValidator;

	@PostMapping
	public ResponseEntity<?> search(@RequestBody SearchForm searchForm) {
		try {
			List<StudentDS> students = studentService.search(searchForm);
			return ResponseEntity.ok(students);
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
		}
	}

	@PostMapping("/create")
	public ResponseEntity<?> createStudent(@RequestBody StudentDS ds) {
		Map<String, String> errors = studentValidator.validate(ds);
		if (!errors.isEmpty()) {
			return ResponseEntity.badRequest().body(errors);
		}

		try {
			Student student = studentService.createStudent(ds);
			if (student != null) {
				return ResponseEntity.ok(student);
			} else {
				return ResponseEntity.badRequest().body("Something went wrong.");
			}
		} catch (Exception e) {
			return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
		}
	}

	@PostMapping("/{id}")
	public ResponseEntity<?> updateStudent(@PathVariable String id, @RequestBody StudentDS ds) {
		Map<String, String> errors = studentValidator.validate(ds);
		if (!errors.isEmpty()) {
			return ResponseEntity.badRequest().body(errors);
		}

		try {
			Student student = studentService.updateStudent(ds);
			return ResponseEntity.ok(student);
		} catch (Exception e) {
			return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
		}
	}

	@GetMapping("/{id}")
	public ResponseEntity<?> getStudentDetails(@PathVariable String id) {
		try {
			StudentDetailsDS ds = studentService.getStudentDetails(id);
			return ResponseEntity.ok(ds);
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
		}
	}

	@PostMapping("/{id}/delete")
	public ResponseEntity<?> deleteStudent(@PathVariable String id) {
		try {
			studentService.deleteStudent(id);
			return ResponseEntity.ok().build();
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
		}
	}

}
