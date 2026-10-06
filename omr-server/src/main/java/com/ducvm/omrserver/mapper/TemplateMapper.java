package com.ducvm.omrserver.mapper;

import com.ducvm.omrserver.dataset.TemplateDS;
import com.ducvm.omrserver.entity.Template;
import com.ducvm.omrserver.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Template mapper for converting between Template entity and TemplateDS DTO.
 */
@Component
@Mapper(componentModel = "spring")
public interface TemplateMapper {

	/**
	 * Convert Template entity to TemplateDS DTO.
	 *
	 * @param entity Template entity
	 * @return TemplateDS DTO
	 */
	@Mapping(target = "ownerId", source = "entity.owner.id")
	TemplateDS toDto(Template entity);

	/**
	 * Convert list of Template entities to list of TemplateDS DTOs.
	 *
	 * @param entities List of Template entities
	 * @return List of TemplateDS DTOs
	 */
	List<TemplateDS> toDtoList(List<Template> entities);

	/**
	 * Convert Page of Template entities to Page of TemplateDS DTOs.
	 *
	 * @param page Page of Template entities
	 * @return Page of TemplateDS DTOs
	 */
	default Page<TemplateDS> toDtoPage(Page<Template> page) {
		if (page == null) {
			return Page.empty();
		}
		return page.map(this::toDto);
	}

}
