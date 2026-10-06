package com.ducvm.omrserver.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * Composite primary key for GradingResult.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GradingResultId implements Serializable {

	private String studentId;
	private Long examId;

	// Serializable requires these methods
	@Override
	public boolean equals(Object o) {
		if (this == o) return true;
		if (o == null || getClass() != o.getClass()) return false;
		GradingResultId that = (GradingResultId) o;
		return studentId.equals(that.studentId) && examId.equals(that.examId);
	}

	@Override
	public int hashCode() {
		return studentId.hashCode() + examId.hashCode();
	}
}