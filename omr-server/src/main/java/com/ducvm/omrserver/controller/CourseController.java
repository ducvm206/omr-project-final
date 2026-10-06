package com.ducvm.omrserver.controller;

import com.ducvm.omrserver.dataset.*;
import com.ducvm.omrserver.entity.Course;
import com.ducvm.omrserver.service.CourseService;
import com.ducvm.omrserver.validator.CourseValidator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/api/courses")
public class CourseController {

	@Autowired
	private CourseService courseService;

	@Autowired
	private CourseValidator courseValidator;

	@PostMapping
	public ResponseEntity<?> search(@RequestBody SearchForm form) {
		try {
			List<CourseDS> courseList = courseService.search(form);
			return ResponseEntity.ok(courseList);
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
		}
	}

	@PostMapping("/create")
	public ResponseEntity<?> createCourse(@RequestBody CourseDS ds) {
		Map<String, String> errors = courseValidator.validate(ds);
		if (!errors.isEmpty()) {
			return ResponseEntity.badRequest().body(errors);
		}

		try {
			Course course = courseService.createCourse(ds);
			return ResponseEntity.ok(course);
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
		}
	}

	@PostMapping("/update")
	public ResponseEntity<?> updateCourse(@RequestBody CourseDS ds) {
		Map<String, String> errors = courseValidator.validate(ds);
		if (!errors.isEmpty()) {
			return ResponseEntity.badRequest().body(errors);
		}

		try {
			Course course = courseService.updateCourse(ds);
			return ResponseEntity.ok(course);
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
		}
	}

	@PostMapping("/{id}/delete")
	public ResponseEntity<?> deleteCourse(@PathVariable Long id) {
		try {
			courseService.deleteCourse(id);
			return ResponseEntity.ok().build();
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
		}
	}

	@GetMapping("/{id}")
	public ResponseEntity<?> getCourseDetails(@PathVariable Long id) {
		try {
			CourseDetailDS ds = courseService.getCourseDetails(id);
			return ResponseEntity.ok(ds);
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
		}
	}

	@PostMapping("{courseId}/enroll/{studentId}")
	public ResponseEntity<?> enrollStudentToCourse(@PathVariable Long courseId, @PathVariable String studentId) {
		try {
			courseService.enrollStudentToCourse(courseId, studentId);
			return ResponseEntity.ok().build();
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
		}
	}

	@GetMapping("/{id}/exams")
	public ResponseEntity<?> getAllExamsInCourse(@PathVariable Long id) {
		try {
			List<ExamDS> list =  courseService.getAllExamsInCourse(id);
			return ResponseEntity.ok(list);
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
		}
	}
}
