package com.example.omr_phone.data.model

data class GradingResult(
    val studentId: String,
    val examId: Long,
    val keyUsed: String,
    val mcqCorrect: Int,
    val mcqPartial: Int,
    val mcqIncorrect: Int,
    val mcqBlank: Int,
    val mcqPoints: Double,
    val writtenCorrect: Int,
    val writtenIncorrect: Int,
    val writtenBlank: Int,
    val writtenPoints: Double,
    val totalPoints: Double,
    val percentage: Double,
    val grade: String,
    val questionResults: List<QuestionResult>,
    val annotatedImage: String
) {

}