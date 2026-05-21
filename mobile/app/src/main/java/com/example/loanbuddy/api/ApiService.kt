package com.example.loanbuddy.model.network

import com.example.loanbuddy.model.*
import okhttp3.MultipartBody
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // ─── Auth ────────────────────────────────────────────────────────────────

    @POST("login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    @POST("register")
    suspend fun register(@Body request: RegisterRequest): RegisterResponse

    // ─── Profile ─────────────────────────────────────────────────────────────

    @GET("profile")
    suspend fun getProfile(@Header("Authorization") token: String): ProfileResponse

    @PUT("profile")
    suspend fun updateProfile(
        @Header("Authorization") token: String,
        @Body request: UpdateProfileRequest
    ): UpdateProfileResponse

    @PUT("profile/password")
    suspend fun updatePassword(
        @Header("Authorization") token: String,
        @Body request: UpdatePasswordRequest
    ): MessageResponse

    @Multipart
    @POST("profile/photo")
    suspend fun uploadPhoto(
        @Header("Authorization") token: String,
        @Part file: MultipartBody.Part
    ): Response<ResponseBody>

    @GET("profile/photo")
    suspend fun getPhoto(
        @Header("Authorization") token: String
    ): Response<ResponseBody>

    // ─── Loans ───────────────────────────────────────────────────────────────

    @GET("loans")
    suspend fun getLoans(@Header("Authorization") token: String): List<Loan>

    @POST("loans")
    suspend fun createLoan(
        @Header("Authorization") token: String,
        @Body request: LoanRequest
    ): Loan

    @PUT("loans/{id}")
    suspend fun updateLoan(
        @Header("Authorization") token: String,
        @Path("id") loanId: String,
        @Body request: LoanRequest
    ): Loan

    @DELETE("loans/{id}")
    suspend fun deleteLoan(
        @Header("Authorization") token: String,
        @Path("id") loanId: String
    ): Response<ResponseBody>

    @POST("loans/{id}/payments")
    suspend fun addPayment(
        @Header("Authorization") token: String,
        @Path("id") loanId: String,
        @Body request: LoanPaymentRequest
    ): LoanPayment

    @PATCH("loans/{loanId}/payments/{paymentId}/archive")
    suspend fun archivePayment(
        @Header("Authorization") token: String,
        @Path("loanId") loanId: String,
        @Path("paymentId") paymentId: String,
        @Body request: ArchiveRequest
    ): Response<ResponseBody>

    @Multipart
    @POST("loans/{loanId}/payments/{paymentId}/proof")
    suspend fun uploadPaymentProof(
        @Header("Authorization") token: String,
        @Path("loanId") loanId: String,
        @Path("paymentId") paymentId: String,
        @Part file: MultipartBody.Part
    ): Response<ResponseBody>

    @GET("loans/{loanId}/payments/{paymentId}/proof")
    suspend fun getPaymentProof(
        @Header("Authorization") token: String,
        @Path("loanId") loanId: String,
        @Path("paymentId") paymentId: String
    ): Response<ResponseBody>

    @POST("loans/{id}/penalties")
    suspend fun addLoanPenalty(
        @Header("Authorization") token: String,
        @Path("id") loanId: String,
        @Body request: PenaltyRequest
    ): LoanPenalty

    @Multipart
    @POST("loans/{id}/proof")
    suspend fun uploadLoanProof(
        @Header("Authorization") token: String,
        @Path("id") loanId: String,
        @Part file: MultipartBody.Part
    ): Response<ResponseBody>

    // ─── Debtors ─────────────────────────────────────────────────────────────

    @GET("debtors")
    suspend fun getDebtors(@Header("Authorization") token: String): List<Debtor>

    @POST("debtors")
    suspend fun createDebtor(
        @Header("Authorization") token: String,
        @Body request: DebtorRequest
    ): Debtor

    @PUT("debtors/{id}")
    suspend fun updateDebtor(
        @Header("Authorization") token: String,
        @Path("id") debtorId: String,
        @Body request: DebtorRequest
    ): Debtor

    @DELETE("debtors/{id}")
    suspend fun archiveDebtor(
        @Header("Authorization") token: String,
        @Path("id") debtorId: String
    ): Response<ResponseBody>

    // ─── Entries ─────────────────────────────────────────────────────────────

    @GET("entries")
    suspend fun getEntries(@Header("Authorization") token: String): List<Entry>

    @POST("entries")
    suspend fun createEntry(
        @Header("Authorization") token: String,
        @Body request: EntryRequest
    ): Entry

    @PUT("entries/{id}")
    suspend fun updateEntry(
        @Header("Authorization") token: String,
        @Path("id") entryId: String,
        @Body request: EntryRequest
    ): Entry

    @DELETE("entries/{id}")
    suspend fun archiveEntry(
        @Header("Authorization") token: String,
        @Path("id") entryId: String
    ): Response<ResponseBody>

    @GET("entries/{id}/collections")
    suspend fun getEntryCollections(
        @Header("Authorization") token: String,
        @Path("id") entryId: String
    ): List<EntryCollection>

    @POST("entries/{id}/collections")
    suspend fun createCollection(
        @Header("Authorization") token: String,
        @Path("id") entryId: String,
        @Body request: CollectionRequest
    ): EntryCollection

    @PATCH("collections/{id}/archive")
    suspend fun archiveCollection(
        @Header("Authorization") token: String,
        @Path("id") collectionId: String,
        @Body request: ArchiveRequest
    ): Response<ResponseBody>

    @Multipart
    @POST("entries/{entryId}/collections/{collectionId}/proof")
    suspend fun uploadCollectionProof(
        @Header("Authorization") token: String,
        @Path("entryId") entryId: String,
        @Path("collectionId") collectionId: String,
        @Part file: MultipartBody.Part
    ): Response<ResponseBody>

    @GET("entries/{entryId}/collections/{collectionId}/proof")
    suspend fun getCollectionProof(
        @Header("Authorization") token: String,
        @Path("entryId") entryId: String,
        @Path("collectionId") collectionId: String
    ): Response<ResponseBody>

    @POST("entries/{id}/penalties")
    suspend fun addEntryPenalty(
        @Header("Authorization") token: String,
        @Path("id") entryId: String,
        @Body request: PenaltyRequest
    ): EntryPenalty

    @Multipart
    @POST("entries/{id}/proof")
    suspend fun uploadEntryProof(
        @Header("Authorization") token: String,
        @Path("id") entryId: String,
        @Part file: MultipartBody.Part
    ): Response<ResponseBody>
}
