package com.ducvm.omrserver.repository;

import com.ducvm.omrserver.entity.Course;
import com.ducvm.omrserver.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CourseRepository extends JpaRepository<Course, Long> {

	@Query("""
	    SELECT c FROM Course c
	    WHERE c.owner = :owner
	      AND (
	          :name IS NULL
	          OR LOWER(c.name) LIKE LOWER(CONCAT('%', CAST(:name AS text), '%'))
	      )
	      AND (
	          :academicYear IS NULL
	          OR c.academicYear = :academicYear
	      )
	""")
	List<Course> search(
			@Param("name") String name,
			@Param("academicYear") String academicYear,
			@Param("owner") User owner
	);

	/**
	 * Find all courses that a student is enrolled in.
	 * The course must also belong to the given owner, so a student's
	 * courses are always scoped to the authenticated user's data.
	 *
	 * @param studentId the student id
	 * @return list of courses
	 */
	@Query("""
    SELECT c FROM Course c
    JOIN c.students s
    WHERE s.id = :studentId
""")
	List<Course> getAllCoursesOfStudent(@Param("studentId") String studentId);

}
