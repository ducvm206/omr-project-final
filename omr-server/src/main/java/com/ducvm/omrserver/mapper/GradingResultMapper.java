package com.ducvm.omrserver.mapper;

import com.ducvm.omrserver.dataset.GradingResultDS;
import com.ducvm.omrserver.dataset.QuestionResultDS;
import com.ducvm.omrserver.entity.GradingResult;
import com.ducvm.omrserver.entity.QuestionResult;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Grading Result mapper.
 */
@Component
@Mapper(componentModel = "spring")
public abstract class GradingResultMapper {

	@Autowired
	protected QuestionResultMapper questionResultMapper;

	/**
	 * Convert a single GradingResult entity to GradingResultDS
	 */
	@Mapping(target = "questionResults", source = "questionResults", qualifiedByName = "mapQuestionResults")
	@Mapping(target = "annotatedImage", ignore = true)
	public abstract GradingResultDS toDS(GradingResult entity);

	/**
	 * Convert a list of GradingResult entities to list of GradingResultDS
	 */
	public List<GradingResultDS> toDSList(List<GradingResult> entities) {
		if (entities == null) {
			return null;
		}
		return entities.stream()
				.map(this::toDS)
				.collect(Collectors.toList());
	}

	/**
	 * Convert a Page of GradingResult entities to Page of GradingResultDS
	 */
	public Page<GradingResultDS> toDSPage(Page<GradingResult> entityPage) {
		if (entityPage == null) {
			return null;
		}
		return entityPage.map(this::toDS);
	}

	/**
	 * Convert list of QuestionResult entities to list of QuestionResultDS
	 */
	@Named("mapQuestionResults")
	protected List<QuestionResultDS> mapQuestionResults(List<QuestionResult> questionResults) {
		if (questionResults == null) {
			return null;
		}
		return questionResultMapper.toDSList(questionResults);
	}

	/**
	 * Convert and set annotated image separately
	 */
	public GradingResultDS toDSWithAnnotatedImage(GradingResult entity, String annotatedImage) {
		GradingResultDS ds = toDS(entity);
		ds.setAnnotatedImage(annotatedImage);
		return ds;
	}
}