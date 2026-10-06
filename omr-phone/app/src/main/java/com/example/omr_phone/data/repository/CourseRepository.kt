package com.example.omr_phone.data.repository

import com.example.omr_phone.data.api.ApiInterface
import com.example.omr_phone.data.dataset.SearchForm
import com.example.omr_phone.data.model.Course
import com.example.omr_phone.data.model.Exam

class CourseRepository(
    private val api: ApiInterface
) {
    suspend fun searchCourses(name: String, academicYear: String): Result<List<Course>> {
        return try {
            val response = api.searchCourses(
                SearchForm(
                    mapOf(
                        "name" to name,
                        "academicYear" to academicYear
                    )
                )
            )

            if (response.isSuccessful) {
                Result.success(response.body() ?: emptyList())
            } else {
                val errorMessage = response.errorBody()?.string() ?: "Failed to search courses"

                Result.failure(Exception(errorMessage))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getExamsFromCourse(courseId: Long): Result<List<Exam>> {
        return try {
            val response = api.getExamsFromCourse(courseId)

            if (response.isSuccessful) {
                Result.success(response.body() ?: emptyList())
            } else {
                val errorMessage = response.errorBody()?.string() ?: "Failed to get exams"
                Result.failure(Exception(errorMessage))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}