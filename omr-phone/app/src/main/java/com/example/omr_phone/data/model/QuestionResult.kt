package com.example.omr_phone.data.model

data class QuestionResult(
    val questionNumber: Int,
    val questionType: String,
    val studentAnswer: String,
    val correctAnswer: String,
    val pointsEarned: Double,
    val pointsMax: Double,
    val isCorrect: Boolean,
    val isPartial: Boolean
) {

}