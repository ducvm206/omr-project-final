package com.example.omr_phone.data.repository

import com.example.omr_phone.data.api.ApiInterface
import com.example.omr_phone.data.dataset.GradingConfig
import com.example.omr_phone.data.model.GradingResult

class GradeRepository(
    private val api: ApiInterface
) {

    suspend fun grade(config: GradingConfig): Result<GradingResult> {

        return try {
            val response = api.grade(config)

            if (response.isSuccessful) {
                val result = response.body()

                if (result != null) {
                    Result.success(result)
                } else {
                    Result.failure(Exception("Server returned an empty response"))
                }

            } else {
                val errorMessage =
                    response.errorBody()?.string()
                        ?: "Grading failed"

                Result.failure(Exception(errorMessage))
            }

        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}