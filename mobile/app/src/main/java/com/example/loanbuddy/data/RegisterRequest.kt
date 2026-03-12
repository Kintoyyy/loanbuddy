package com.example.loanbuddy.data

data class RegisterRequest(
    val email: String,
    val password: String,
    val data: Map<String, String>
)
