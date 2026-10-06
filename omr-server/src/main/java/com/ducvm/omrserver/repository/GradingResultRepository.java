package com.ducvm.omrserver.repository;

import com.ducvm.omrserver.entity.Course;
import com.ducvm.omrserver.entity.Exam;
import com.ducvm.omrserver.entity.GradingResult;
import com.ducvm.omrserver.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * Grading result repository.
 */
public interface GradingResultRepository extends JpaRepository<GradingResult, Long> {

	/**
	 * Find all grading results by exam.
	 * @param exam exam
	 * @return list of grading results
	 */
	@Query("""
		SELECT gr FROM GradingResult gr WHERE gr.exam = :exam
	""")
	List<GradingResult> findAllByExam(@Param("exam") Exam exam);

	/**
	 * Find all grading results by student.
	 * @param student student
	 * @return list of grading results
	 */
	@Query("""
		SELECT gr FROM GradingResult gr WHERE gr.student = :student
	""")
	List<GradingResult> findAllByStudent(@Param("student") Student student);

	/**
	 * Find all grading results by exam and students.
	 * @param exam exam
	 * @param student student
	 * @return list of grading results
	 */
	@Query("""
		SELECT gr FROM GradingResult gr WHERE gr.student = :student AND gr.exam = :exam
	""")
	List<GradingResult> findAllByStudentAndExam(@Param("exam") Exam exam, @Param("student") Student student);

	@Query("""
		SELECT gr FROM GradingResult gr WHERE gr.exam.course = :course
	""")
	List<GradingResult> findAllByCourse(@Param("course") Course course);

	@Query("""
		SELECT gr FROM GradingResult gr
		WHERE gr.exam.course = :course
		AND gr.student = :student
	""")
	List<GradingResult> findAllByStudentAndCourse(@Param("student") Student student, @Param("course") Course course);

}
