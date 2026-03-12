package com.example.loanbuddy.data

data class UserData(
    val id: String?,
    val email: String?,
    val role: String?,
    val user_metadata: UserMetadata?,
    val app_metadata: AppMetadata?
)

data class UserMetadata(
    val full_name: String?,
    val role: String?
)

data class AppMetadata(
    val role: String?
)
