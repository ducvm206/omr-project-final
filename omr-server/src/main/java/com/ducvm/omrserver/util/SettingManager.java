package com.ducvm.omrserver.util;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.PropertySource;
import org.springframework.stereotype.Component;

@Component
@PropertySource("classpath:settings.properties")
@Getter
public class SettingManager {
	/**
	 * OMR Engine server host.
	 */
	@Value("${engine.host}")
	private String engineHost;
	/**
	 * OMR Engine server port.
	 */
	@Value("${engine.port}")
	private Integer enginePort;
}
