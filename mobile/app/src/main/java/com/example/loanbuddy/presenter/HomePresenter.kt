package com.example.loanbuddy.presenter

import com.example.loanbuddy.model.Entry
import com.example.loanbuddy.model.Debtor
import com.example.loanbuddy.model.Loan
import com.example.loanbuddy.model.network.RetrofitClient
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope

data class HomeSummary(
    val entries: List<Entry>,
    val debtors: List<Debtor>,
    val loans: List<Loan>
)

class HomePresenter {
    suspend fun loadSummary(token: String): HomeSummary = coroutineScope {
        val entries = async { RetrofitClient.apiService.getEntries(token) }
        val debtors = async { RetrofitClient.apiService.getDebtors(token) }
        val loans = async { RetrofitClient.apiService.getLoans(token) }
        HomeSummary(entries.await(), debtors.await(), loans.await())
    }
}