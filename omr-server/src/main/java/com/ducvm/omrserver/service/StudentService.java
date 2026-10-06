package com.ducvm.omrserver.service;

import com.ducvm.omrserver.dataset.*;
import com.ducvm.omrserver.entity.Course;
import com.ducvm.omrserver.entity.GradingResult;
import com.ducvm.omrserver.entity.Student;
import com.ducvm.omrserver.entity.User;
import com.ducvm.omrserver.mapper.GradingResultMapper;
import com.ducvm.omrserver.repository.CourseRepository;
import com.ducvm.omrserver.repository.GradingResultRepository;
import com.ducvm.omrserver.repository.StudentRepository;
import com.ducvm.omrserver.util.Utils;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Slf4j
public class StudentService {
	/**
	 * Student repo.
	 */
	@Autowired
	private StudentRepository studentRepository;
	/**
	 * Course repository.
	 */
	@Autowired
	private CourseRepository courseRepository;
	/**
	 * Grading result repo.
	 */
	@Autowired
	private GradingResultRepository gradingResultRepository;
	/**
	 * Grading result mapper.
	 */
	@Autowired
	private GradingResultMapper gradingResultMapper;

	/**
	 * Get student by id.
	 * @param id student id.
	 * @return student
	 * @throws Exception server error
	 */
	public Student findById(String id) throws Exception {
		try {
			return studentRepository.findById(id).orElse(null);
		} catch (Exception e) {
			throw new Exception("Internal server error");
		}
	}

	/**
	 * Search students.
	 * @param searchForm Search form all students.
	 * @return List of students
	 * @throws Exception if server error
	 */
	public List<StudentDS> search(SearchForm searchForm) throws Exception {
		Map<String, String> params = searchForm.getSearchParams();

		// Get parameters with null safety
		String id = params != null ? params.get("id") : null;
		String name = params != null ? params.get("name") : null;
		User user = Utils.getCurrentUser();

		try {
			List<Student> students = studentRepository.search(user.getId(), id, name);
			List<StudentDS> studentsDS = new ArrayList<>();
			for (Student student : students) {
				StudentDS studentDS = new StudentDS();
				studentDS.setId(student.getId());
				studentDS.setName(student.getName());
				studentDS.setOwnerId(student.getOwner().getId());
				studentsDS.add(studentDS);
			}
			return studentsDS;
		} catch (Exception e) {
			throw new Exception("Internal server error");
		}
	}

	/**
	 * Create new student
	 * @param ds StudentDS
	 * @return new student
	 * @throws Exception if server error
	 */
	public Student createStudent(StudentDS ds) throws Exception {
		Student student = new Student();
		User user = Utils.getCurrentUser();
		student.setId(ds.getId());
		student.setName(ds.getName());
		student.setOwner(user);

		try {
			return studentRepository.save(student);
		} catch (Exception e) {
			throw new Exception("Internal server error");
		}
	}

	/**
	 * Update student
	 * @param ds StudentDS
	 * @return new student
	 * @throws Exception if server error
	 */
	@Transactional
	public Student updateStudent(StudentDS ds) throws Exception {
		Optional<Student> opt = studentRepository.findById(ds.getId());

		if (opt.isEmpty()) {
			throw new Exception("Student not found");
		}

		Student student = opt.get();
		User user = Utils.getCurrentUser();
		student.setName(ds.getName());
		student.setOwner(user);

		return studentRepository.save(student);
	}

	/**
	 * Delete student
	 * @param id student id
	 * @throws Exception if not found or server error
	 */
	@Transactional
	public void deleteStudent(String id) throws Exception {
		try {
			Optional<Student> opt = studentRepository.findById(id);
			if (opt.isEmpty()) {
				throw new Exception("Student not found");
			}
			studentRepository.delete(opt.get());
		} catch (Exception e) {
			throw new Exception("Internal server error");
		}
	}

	/**
	 * See student details
	 * @param id
	 * @return
	 * @throws Exception
	 */
	public StudentDetailsDS getStudentDetails(String id) throws Exception {
		Optional<Student> opt = studentRepository.findById(id);
		if (opt.isEmpty()) {
			throw new Exception("Student not found");
		}

		StudentDetailsDS details = new StudentDetailsDS();
		details.setName(opt.get().getName());
		details.setId(opt.get().getId());
		details.setCourses(getAllCourses(id));
		details.setGradingResults(getAllResults(opt.get()));

		return details;
	}

	private List<CourseDS> getAllCourses(String id) throws Exception {
		try {
			List<Course> courses = courseRepository.getAllCoursesOfStudent(id);
			List<CourseDS> result = new ArrayList<>();
			for (Course c : courses) {
				CourseDS ds = new CourseDS();
				ds.setId(c.getId());
				ds.setName(c.getName());
				ds.setAcademicYear(c.getAcademicYear());
				result.add(ds);
			}
			return result;
		} catch (Exception e) {
			throw new Exception("Internal server error");
		}
	}

	/**
	 * Get all grading results from the student.
	 * @param student Student
	 * @return list of grading results
	 * @throws Exception server error
	 */
	private List<GradingResultDS> getAllResults(Student student) throws Exception {
		try {
			List<GradingResult> gradingResults = gradingResultRepository.findAllByStudent(student);
			return gradingResultMapper.toDSList(gradingResults);
		} catch (Exception e) {
			throw new Exception("Internal server error");
		}
	}

}
