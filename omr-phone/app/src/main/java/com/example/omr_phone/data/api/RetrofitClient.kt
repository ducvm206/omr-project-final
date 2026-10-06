package com.example.omr_phone.data.api

import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object RetrofitClient {
    private const val BASE_URL = "http://192.168.2.131:8001/"

    private val cookieJar = InMemoryCookieJar()

    private val client = OkHttpClient.Builder()
        .cookieJar(cookieJar)
        .build()

    val api: ApiInterface by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiInterface::class.java)
    }
}