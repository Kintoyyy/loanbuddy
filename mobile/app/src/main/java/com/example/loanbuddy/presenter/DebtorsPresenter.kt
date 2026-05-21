package com.example.loanbuddy.presenter

import com.example.loanbuddy.model.Debtor
import com.example.loanbuddy.model.DebtorRequest
import com.example.loanbuddy.model.network.RetrofitClient

class DebtorsPresenter {
    suspend fun loadDebtors(token: String): List<Debtor> = RetrofitClient.apiService.getDebtors(token)

    suspend fun createDebtor(token: String, request: DebtorRequest): Debtor = RetrofitClient.apiService.createDebtor(token, request)

    suspend fun updateDebtor(token: String, debtorId: String, request: DebtorRequest): Debtor =
        RetrofitClient.apiService.updateDebtor(token, debtorId, request)

    suspend fun archiveDebtor(token: String, debtorId: String) = RetrofitClient.apiService.archiveDebtor(token, debtorId)
}