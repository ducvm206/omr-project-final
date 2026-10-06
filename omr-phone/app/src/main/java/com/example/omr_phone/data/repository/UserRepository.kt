package com.example.omr_phone.data.repository

import com.example.omr_phone.data.api.ApiInterface
import com.example.omr_phone.data.dataset.UpdateUserRequest
import com.example.omr_phone.data.model.User

class UserRepository(
    private val api: ApiInterface
) {

    suspend fun getCurrentUser(): Result<User> {
        return try {
            val response = api.me()

            if (response.isSuccessful) {
                val user = response.body()

                if (user != null) {
                    Result.success(user)
                } else {
                    Result.failure(
                        Exception("Server returned an empty user")
                    )
                }
            } else {
                val errorMessage =
                    response.errorBody()?.string()
                        ?: "Failed to get current user"

                Result.failure(
                    Exception(errorMessage)
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateUser(
        request: UpdateUserRequest
    ): Result<User> {
        return try {
            val response = api.updateMe(request)

            if (response.isSuccessful) {
                val user = response.body()

                if (user != null) {
                    Result.success(user)
                } else {
                    Result.failure(
                        Exception("Server returned an empty user")
                    )
                }
            } else {
                val errorMessage =
                    response.errorBody()?.string()
                        ?: "Failed to update user"

                Result.failure(
                    Exception(errorMessage)
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}