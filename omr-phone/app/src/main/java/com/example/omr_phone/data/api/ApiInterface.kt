package com.example.omr_phone.data.api

import com.example.omr_phone.data.dataset.GradingConfig
import com.example.omr_phone.data.dataset.LoginRequest
import com.example.omr_phone.data.dataset.SearchForm
import com.example.omr_phone.data.dataset.UpdateUserRequest
import com.example.omr_phone.data.model.Course
import com.example.omr_phone.data.model.Exam
import com.example.omr_phone.data.model.GradingResult
import com.example.omr_phone.data.model.User
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface ApiInterface {

    /**
     * Login endpoint.
     */
    @POST("/api/login")
    suspend fun login(@Body req: LoginRequest): Response<Unit>

    /**
     * Logout endpoint.
     */
    @POST("/api/logout")
    suspend fun logout(): Response<Unit>

    /**
     * Current user endpoint.
     */
    @GET("/api/me")
    suspend fun me(): Response<User>

    /**
     * Edit user endpoint.
     */
    @POST("/api/me/edit")
    suspend fun updateMe(@Body req: UpdateUserRequest): Response<User>

    /**
     * Get courses endpoint.
     */
    @POST("/api/courses")
    suspend fun searchCourses(@Body form: SearchForm): Response<List<Course>>

    /**
     * Get exams from course endpoint.
     */
    @GET("/api/courses/{id}/exams")
    suspend fun getExamsFromCourse(@Path("id") id: Long): Response<List<Exam>>

    /**
     * Perform grading endpoint.
     */
    @POST("/api/grade")
    suspend fun grade(@Body config: GradingConfig): Response<GradingResult>
}