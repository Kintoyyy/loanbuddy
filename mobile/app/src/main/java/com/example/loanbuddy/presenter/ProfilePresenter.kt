package com.example.loanbuddy.presenter

import com.example.loanbuddy.model.*
import com.example.loanbuddy.model.network.RetrofitClient
import okhttp3.MultipartBody
import okhttp3.ResponseBody
import retrofit2.Response

class ProfilePresenter {
    suspend fun loadProfile(token: String): ProfileResponse = RetrofitClient.apiService.getProfile(token)

    suspend fun updateProfile(token: String, request: UpdateProfileRequest): UpdateProfileResponse =
        RetrofitClient.apiService.updateProfile(token, request)

    suspend fun updatePassword(token: String, request: UpdatePasswordRequest): MessageResponse =
        RetrofitClient.apiService.updatePassword(token, request)

    suspend fun uploadPhoto(token: String, file: MultipartBody.Part): Response<ResponseBody> =
        RetrofitClient.apiService.uploadPhoto(token, file)

    suspend fun getPhoto(token: String): Response<ResponseBody> = RetrofitClient.apiService.getPhoto(token)
}