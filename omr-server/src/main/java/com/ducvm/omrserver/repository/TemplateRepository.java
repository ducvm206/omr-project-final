package com.ducvm.omrserver.repository;

import com.ducvm.omrserver.entity.Exam;
import com.ducvm.omrserver.entity.Student;
import com.ducvm.omrserver.entity.Template;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TemplateRepository extends JpaRepository<Template, Long> {

	@Query("""
        SELECT t FROM Template t
        WHERE t.owner.id = :ownerId
          AND (
              :name IS NULL
              OR :name = ''
              OR LOWER(t.name) LIKE LOWER(CONCAT('%', :name, '%'))
          )
    """)
	List<Template> search(@Param("ownerId") Long ownerId, @Param("name") String name);


}
