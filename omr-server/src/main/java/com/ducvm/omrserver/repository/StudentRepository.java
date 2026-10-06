package com.ducvm.omrserver.repository;

import com.ducvm.omrserver.entity.Course;
import com.ducvm.omrserver.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface StudentRepository extends JpaRepository<Student, String> {

	@Query("""
	    SELECT s FROM Student s
	    WHERE s.owner.id = :ownerId
	      AND (
	          :id IS NULL
	          OR LOWER(s.id) LIKE LOWER(CONCAT('%', CAST(:id AS text), '%'))
	      )
	      AND (
	          :name IS NULL
	          OR LOWER(s.name) LIKE LOWER(CONCAT('%', CAST(:name AS text), '%'))
	      )
	""")
	List<Student> search(@Param("ownerId") Long ownerId, @Param("id") String id, @Param("name") String name);

	@Query("""
	    SELECT s FROM Student s WHERE s.owner.id = :ownerId
	    AND s.id NOT IN (
	        SELECT st.id FROM Course c
	        JOIN c.students st
	        WHERE c.id = :courseId
    )
    """)
	List<Student> findAvailableStudents(@Param("ownerId") Long ownerId, @Param("courseId") Long courseId);

}
