package com.example.loanbuddy.presenter

import com.example.loanbuddy.model.Entry
import com.example.loanbuddy.model.Debtor
import com.example.loanbuddy.model.Loan
import com.example.loanbuddy.model.network.RetrofitClient

data class HomeSummary(
    val entries: List<Entry>,
    val debtors: List<Debtor>,
    val loans: List<Loan>
)

class HomePresenter {
    suspend fun loadSummary(token: String): HomeSummary {
        val entries = RetrofitClient.apiService.getEntries(token)
        val debtors = RetrofitClient.apiService.getDebtors(token)
        val loans = RetrofitClient.apiService.getLoans(token)
        return HomeSummary(entries, debtors, loans)
    }
}