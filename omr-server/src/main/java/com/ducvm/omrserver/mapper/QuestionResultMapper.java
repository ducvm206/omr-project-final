package com.ducvm.omrserver.mapper;

import com.ducvm.omrserver.dataset.QuestionResultDS;
import com.ducvm.omrserver.entity.QuestionResult;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Question result mapper.
 */
@Component
@Mapper(componentModel = "spring")
public interface QuestionResultMapper {

	/**
	 * Convert a single QuestionResult entity to QuestionResultDS
	 * MapStruct will automatically map fields with the same name
	 */
	QuestionResultDS toDS(QuestionResult entity);

	/**
	 * Convert a list of QuestionResult entities to list of QuestionResultDS
	 */
	List<QuestionResultDS> toDSList(List<QuestionResult> entities);

	/**
	 * Convert a Page of QuestionResult entities to Page of QuestionResultDS
	 */
	default Page<QuestionResultDS> toDSPage(Page<QuestionResult> entityPage) {
		if (entityPage == null) {
			return null;
		}
		return entityPage.map(this::toDS);
	}
}
