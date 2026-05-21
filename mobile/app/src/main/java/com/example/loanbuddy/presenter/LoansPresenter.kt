package com.example.loanbuddy.presenter

import com.example.loanbuddy.model.*
import com.example.loanbuddy.model.network.RetrofitClient
import okhttp3.MultipartBody
import okhttp3.ResponseBody
import retrofit2.Response

class LoansPresenter {
    suspend fun loadLoans(token: String): List<Loan> = RetrofitClient.apiService.getLoans(token)

    suspend fun createLoan(token: String, request: LoanRequest): Loan = RetrofitClient.apiService.createLoan(token, request)

    suspend fun updateLoan(token: String, loanId: String, request: LoanRequest): Loan = RetrofitClient.apiService.updateLoan(token, loanId, request)

    suspend fun deleteLoan(token: String, loanId: String): Response<ResponseBody> = RetrofitClient.apiService.deleteLoan(token, loanId)

    suspend fun addPayment(token: String, loanId: String, request: LoanPaymentRequest): LoanPayment = RetrofitClient.apiService.addPayment(token, loanId, request)

    suspend fun archivePayment(token: String, loanId: String, paymentId: String): Response<ResponseBody> =
        RetrofitClient.apiService.archivePayment(token, loanId, paymentId, ArchiveRequest(""))

    suspend fun addLoanPenalty(token: String, loanId: String, request: PenaltyRequest): LoanPenalty =
        RetrofitClient.apiService.addLoanPenalty(token, loanId, request)

    suspend fun uploadLoanProof(token: String, loanId: String, file: MultipartBody.Part): Response<ResponseBody> =
        RetrofitClient.apiService.uploadLoanProof(token, loanId, file)

    suspend fun uploadPaymentProof(token: String, loanId: String, paymentId: String, file: MultipartBody.Part): Response<ResponseBody> =
        RetrofitClient.apiService.uploadPaymentProof(token, loanId, paymentId, file)

    suspend fun getPaymentProof(token: String, loanId: String, paymentId: String): Response<ResponseBody> =
        RetrofitClient.apiService.getPaymentProof(token, loanId, paymentId)
}