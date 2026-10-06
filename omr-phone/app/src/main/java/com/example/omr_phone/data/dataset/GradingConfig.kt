package com.example.omr_phone.data.dataset

class GradingConfig(
    val examId: Long,
    val partial: Boolean,
    val answerSheet: FileData
) {
    data class FileData(
        val bytes: String
    )
}