package com.ducvm.omrserver.controller;

import com.ducvm.omrserver.dataset.SearchForm;
import com.ducvm.omrserver.dataset.TemplateConfig;
import com.ducvm.omrserver.dataset.TemplateDS;
import com.ducvm.omrserver.entity.Template;
import com.ducvm.omrserver.service.TemplateService;
import com.ducvm.omrserver.validator.TemplateValidator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/api/templates")
@Slf4j
public class TemplateController {
	/**
	 * Template service.
	 */
	@Autowired
	private TemplateService templateService;
	/**
	 * Template validator.
	 */
	@Autowired
	private TemplateValidator templateValidator;

	@PostMapping
	public ResponseEntity<?> search(@RequestBody SearchForm form) {
		try {
			List<TemplateDS> templates = templateService.search(form);
			return ResponseEntity.ok(templates);
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
		}
	}

	@PostMapping("/create")
	public ResponseEntity<?> createTemplate(@RequestBody TemplateConfig req) {
		Map<String, String> errors = templateValidator.validate(req);
		if (!errors.isEmpty()) {
			return ResponseEntity.badRequest().body(errors);
		}

		try {
			Template template = templateService.createTemplate(req);
			return ResponseEntity.status(HttpStatus.CREATED).body(template);
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
		}
	}

	@PostMapping("/{id}/delete")
	public ResponseEntity<?> deleteTemplate(@PathVariable Long id) {
		try {
			templateService.deleteTemplate(id);
			return ResponseEntity.ok().build();
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
		}
	}

	@GetMapping("/{id}/view")
	public ResponseEntity<byte[]> viewTemplate(@PathVariable Long id) {
		log.info("Viewing template PDF with ID: {}", id);

		Template template = templateService.findById(id);

		if (template.getFileBytes() == null || template.getFileBytes().length == 0) {
			throw new RuntimeException("Template PDF not found for ID: " + id);
		}

		byte[] pdfBytes = template.getFileBytes();

		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.APPLICATION_PDF);
		headers.setContentDisposition(
				ContentDisposition.inline()
						.filename(template.getName() + ".pdf", StandardCharsets.UTF_8)
						.build()
		);
		log.info("Viewing PDF file for Template {}", template.getName());
		headers.setContentLength(pdfBytes.length);

		return ResponseEntity.ok().headers(headers).body(pdfBytes);
	}
}
