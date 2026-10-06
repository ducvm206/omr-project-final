package com.example.omr_phone.data.model

data class Exam (
    val id: Long,
    val templateId: Long,
    val courseId: Long,
    val name: String,
    val mcqPoints: Double,
    val writtenPoints: Double,
    val totalPoints: Double,
    val noOfKeys: Int,
    val gradeAThreshold: Double,
    val gradeBThreshold: Double,
    val gradeCThreshold: Double,
    val gradeDThreshold: Double
) {
}