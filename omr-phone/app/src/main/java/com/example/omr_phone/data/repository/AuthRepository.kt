package com.example.omr_phone.data.repository

import com.example.omr_phone.data.api.ApiInterface
import com.example.omr_phone.data.dataset.LoginRequest
import com.google.gson.Gson

class AuthRepository(
    private val api: ApiInterface
) {

    suspend fun login(userName: String, password: String): Result<Unit> {
        return try {
            val response = api.login(
                LoginRequest(
                    userName = userName,
                    password = password
                )
            )

            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                val errorMessage = response.errorBody()?.string() ?: "Login failed"
                Result.failure(Exception(errorMessage))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun logout(): Result<Unit> {
        return try {
            val response = api.logout()

            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                val errorMessage = response.errorBody()?.string() ?: "Logout failed"
                Result.failure(Exception(errorMessage))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}