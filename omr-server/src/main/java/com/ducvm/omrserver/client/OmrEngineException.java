package com.ducvm.omrserver.client;

public class OmrEngineException extends RuntimeException {

	public OmrEngineException(String message) {
		super(message);
	}

	public OmrEngineException(String message, Throwable cause) {
		super(message, cause);
	}
}
