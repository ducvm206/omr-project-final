package com.ducvm.omrserver.service;

import com.ducvm.omrserver.dataset.*;
import com.ducvm.omrserver.entity.*;
import com.ducvm.omrserver.mapper.GradingResultMapper;
import com.ducvm.omrserver.repository.CourseRepository;
import com.ducvm.omrserver.repository.ExamRepository;
import com.ducvm.omrserver.repository.GradingResultRepository;
import com.ducvm.omrserver.repository.StudentRepository;
import com.ducvm.omrserver.util.Utils;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Slf4j
@Service
public class CourseService {
	/**
	 * Course repo.
	 */
	@Autowired
	private CourseRepository courseRepository;
	/**
	 * Student repo.
	 */
	@Autowired
	private StudentRepository studentRepository;
	/**
	 * Exam repo.
	 */
	@Autowired
	private ExamRepository examRepository;
	/**
	 * Grading result repo.
	 */
	@Autowired
	private GradingResultRepository gradingResultRepo;
	/**
	 * Grading result mapper.
	 */
	@Autowired
	private GradingResultMapper gradingResultMapper;

	/**
	 * Find course by Id.
	 * @param id
	 * @return
	 */
	public Course findById(Long id) {
		Optional<Course> course = courseRepository.findById(id);
		return course.orElse(null);
	}

	/**
	 * Search courses
	 * @param form SearchForm
	 * @return list of courses
	 * @throws Exception
	 */
	public List<CourseDS> search(SearchForm form) throws Exception {
		Map<String, String> params = form.getSearchParams();
		String name = params != null ? params.get("name") : null;
		String academicYear = params != null ? params.get("academicYear") : null;

		User user = Utils.getCurrentUser();

		try {
			List<Course> courses = courseRepository.search(name, academicYear, user);
			List<CourseDS> courseDSs = new ArrayList<>();
			for (Course course : courses) {
				CourseDS courseDS = new CourseDS();
				courseDS.setId(course.getId());
				courseDS.setName(course.getName());
				courseDS.setAcademicYear(course.getAcademicYear());
				courseDS.setDescription(course.getDescription());
				courseDSs.add(courseDS);
			}
			return courseDSs;
		} catch (Exception e) {
			throw new Exception("Internal server error");
		}
	}

	/**
	 * Create new course.
	 * @param ds CourseDS
	 * @return new Course
	 * @throws Exception
	 */
	public Course createCourse(CourseDS ds) throws Exception {
		User user = Utils.getCurrentUser();
		Course course = new Course();
		course.setName(ds.getName());
		course.setAcademicYear(ds.getAcademicYear());
		course.setDescription(ds.getDescription());
		course.setOwner(user);
		try {
			Course c = courseRepository.save(course);
			log.info("Course created with id: {}, name: {}", c.getId(), c.getName());
			return c;
		} catch (Exception e) {
			throw new Exception("Internal server error");
		}
	}

	/**
	 * Update existing course.
	 * @param ds CourseDS
	 * @return updated Course
	 * @throws Exception
	 */
	@Transactional
	public Course updateCourse(CourseDS ds) throws Exception {
		User user = Utils.getCurrentUser();
		Optional<Course> opt = courseRepository.findById(ds.getId());
		if (opt.isEmpty()) {
			throw new Exception("Course not found");
		}
		Course course = opt.get();
		course.setName(ds.getName());
		course.setAcademicYear(ds.getAcademicYear());
		course.setDescription(ds.getDescription());
		course.setOwner(user);
		try {
			return courseRepository.save(course);
		} catch (Exception e) {
			throw new Exception("Internal server error");
		}
	}

	/**
	 * Delete course
	 * @param id course id
	 * @throws Exception
	 */
	public void deleteCourse(Long id) throws Exception {
		try {
			courseRepository.deleteById(id);
			log.info("Course with id {} deleted", id);
		} catch (Exception e) {
			throw new Exception("Course not found");
		}
	}

	/**
	 * Enroll student
	 * @param courseId course id.
	 * @param studentId student id.
	 * @throws Exception
	 */
	@Transactional
	public void enrollStudentToCourse(Long courseId, String studentId) throws Exception {
		Optional<Course> optCourse = courseRepository.findById(courseId);
		if (optCourse.isEmpty()) {
			throw new Exception("Course not found");
		}

		Optional<Student> optStudent = studentRepository.findById(studentId);
		if (optStudent.isEmpty()) {
			throw new Exception("Student not found");
		}

		Student student = optStudent.get();
		Course course = optCourse.get();
		User user = Utils.getCurrentUser();
		List<Student> availableStudents = studentRepository.findAvailableStudents(user.getId(), courseId);

		boolean found = false;
		for (Student s : availableStudents) {
			if (s.getId().equals(studentId)) {
				course.getStudents().add(student);
				found = true;
				break;
			}
		}

		if (!found) {
			throw new Exception("Student not available");
		}

		courseRepository.save(course);
	}

	/**
	 * Get all students in course
	 * @param courseId course id.
	 * @return list of students
	 * @throws Exception
	 */
	public List<StudentDS> getAllStudentsInCourse(Long courseId) throws Exception {
		Course course = findById(courseId);
		try {
			Set<Student> students = course.getStudents();
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
	 * Get course details
	 * @param id course id
	 * @return Course details DS
	 * @throws Exception
	 */
	public CourseDetailDS getCourseDetails(Long id) throws Exception {
		try {
			Course course = courseRepository.findById(id)
					.orElseThrow(() -> new Exception("Course not found"));

			CourseDetailDS details = new CourseDetailDS();

			// Populate general course info
			details.setName(course.getName());
			details.setAcademicYear(course.getAcademicYear());
			details.setDescription(course.getDescription());

			// Set list of students
			List<StudentDS> students = getAllStudentsInCourse(id);
			details.setStudents(students);

			// Populate student results field
			List<CourseDetailDS.StudentResultDS> studentResList = new ArrayList<>();
			for (StudentDS student : students) {
				Student stu = studentRepository.findById(student.getId()).get();
				List<GradingResult> results =
						gradingResultRepo.findAllByStudentAndCourse(stu, course);

				CourseDetailDS.StudentResultDS ds = new CourseDetailDS.StudentResultDS();
				ds.setId(student.getId());
				ds.setName(stu.getName());
				ds.setGradingResults(gradingResultMapper.toDSList(results));
				studentResList.add(ds);
			}
			details.setStudentResults(studentResList);

			// Populate exam results
			List<Exam> exams = examRepository.getAllExamsInCourse(course);
			List<ExamResultDS> examResults = new ArrayList<>();

			for (Exam e : exams) {
				ExamResultDS res = new ExamResultDS();

				List<GradingResult> results = gradingResultRepo.findAllByExam(e);

				res.setId(e.getId());
				res.setName(e.getName());
				res.setNoOfKeys(e.getNoOfKeys());
				res.setGradingResults(gradingResultMapper.toDSList(results));

				if (results.isEmpty()) {
					res.setAverageScore(null);
					res.setMedianScore(null);
				} else {
					double totalPoints = 0.0;
					List<Double> points = new ArrayList<>(results.size());
					for (GradingResult r : results) {
						double pts = r.getTotalPoints();
						totalPoints += pts;
						points.add(pts);
					}
					res.setAverageScore(totalPoints / points.size());
					res.setMedianScore(Utils.getMedianOfArray(points));
				}

				examResults.add(res);
			}

			details.setExamResults(examResults);
			return details;

		} catch (Exception e) {
			throw new Exception("Internal server error");
		}
	}

	/**
	 * (MOBILE ONLY)
	 * Get all exams in a course.
	 */
	public List<ExamDS> getAllExamsInCourse(Long courseId) throws Exception {
		Course course = courseRepository.findById(courseId)
				.orElseThrow(() -> new Exception("Course not found"));
		List<Exam> exams = examRepository.getAllExamsInCourse(course);
		List<ExamDS> examList = new ArrayList<>();
		for (Exam e : exams) {
			ExamDS ds = new ExamDS();
			ds.setId(e.getId());
			ds.setTemplateId(e.getTemplate().getId());
			ds.setCourseId(courseId);
			ds.setName(e.getName());
			ds.setMcqPoints(e.getMcqPoints());
			ds.setWrittenPoints(e.getWrittenPoints());
			ds.setTotalPoints(e.getTotalPoints());
			ds.setNoOfKeys(e.getNoOfKeys());
			ds.setGradeAThreshold(e.getGradeAThreshold());
			ds.setGradeBThreshold(e.getGradeBThreshold());
			ds.setGradeCThreshold(e.getGradeCThreshold());
			ds.setGradeDThreshold(e.getGradeDThreshold());
			examList.add(ds);
		}
		return examList;
	}
}
