package com.ducvm.omrserver.dataset;

import lombok.Getter;
import lombok.Setter;

import java.util.HashMap;
import java.util.Map;

@Getter
@Setter
public class SearchForm {

	private Map<String, String> searchParams = new HashMap<>();

}
