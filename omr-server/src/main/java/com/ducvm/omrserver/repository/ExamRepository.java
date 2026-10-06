package com.ducvm.omrserver.repository;

import com.ducvm.omrserver.entity.Course;
import com.ducvm.omrserver.entity.Exam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;


public interface ExamRepository extends JpaRepository<Exam, Long> {

	@Query("""
		SELECT e FROM Exam e WHERE e.course = :course
	""")
	List<Exam> getAllExamsInCourse(Course course);

	@Query("SELECT e FROM Exam e JOIN FETCH e.template WHERE e.id = :examId")
	Optional<Exam> findByIdWithTemplate(@Param("examId") Long examId);

	/**
	 * Check if a student is enrolled in the course that this exam belongs to.
	 *
	 * @param examId Exam ID
	 * @param studentId Student ID
	 * @return true if student is enrolled in the exam's course
	 */
	@Query("""
        SELECT CASE WHEN COUNT(e) > 0 THEN true ELSE false END
        FROM Exam e
        JOIN e.course c
        JOIN c.students s
        WHERE e.id = :examId AND s.id = :studentId
    """)
	boolean isStudentInExam(@Param("examId") Long examId, @Param("studentId") String studentId);
}
