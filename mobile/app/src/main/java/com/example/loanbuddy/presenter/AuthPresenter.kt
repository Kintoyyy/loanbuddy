package com.example.loanbuddy.presenter

import com.example.loanbuddy.model.LoginRequest
import com.example.loanbuddy.model.LoginResponse
import com.example.loanbuddy.model.RegisterRequest
import com.example.loanbuddy.model.RegisterResponse
import com.example.loanbuddy.model.network.RetrofitClient

class AuthPresenter {
    suspend fun login(request: LoginRequest): LoginResponse = RetrofitClient.apiService.login(request)

    suspend fun register(request: RegisterRequest): RegisterResponse = RetrofitClient.apiService.register(request)
}