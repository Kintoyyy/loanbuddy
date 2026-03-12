package com.example.loanbuddy.api

import com.example.loanbuddy.data.LoginRequest
import com.example.loanbuddy.data.LoginResponse
import com.example.loanbuddy.data.RegisterRequest
import com.example.loanbuddy.data.UserData
import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST

interface ApiService {

    @POST("auth/v1/token?grant_type=password")
    fun login(@Body loginRequest: LoginRequest): Call<LoginResponse>

    @POST("auth/v1/signup")
    fun register(@Body registerRequest: RegisterRequest): Call<LoginResponse>

    @GET("auth/v1/user")
    fun getCurrentUser(@Header("Authorization") bearerToken: String): Call<UserData>
}
