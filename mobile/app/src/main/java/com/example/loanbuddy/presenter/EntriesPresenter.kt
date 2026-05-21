package com.example.loanbuddy.presenter

import com.example.loanbuddy.model.*
import com.example.loanbuddy.model.network.RetrofitClient
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import okhttp3.MultipartBody
import okhttp3.ResponseBody
import retrofit2.Response

data class EntriesSummary(
    val entries: List<Entry>,
    val debtors: List<Debtor>
)

class EntriesPresenter {
    suspend fun loadSummary(token: String): EntriesSummary = coroutineScope {
        val entries = async { RetrofitClient.apiService.getEntries(token) }
        val debtors = async { RetrofitClient.apiService.getDebtors(token) }
        EntriesSummary(entries.await(), debtors.await())
    }

    suspend fun createEntry(token: String, request: EntryRequest): Entry = RetrofitClient.apiService.createEntry(token, request)

    suspend fun updateEntry(token: String, entryId: String, request: EntryRequest): Entry = RetrofitClient.apiService.updateEntry(token, entryId, request)

    suspend fun archiveEntry(token: String, entryId: String) = RetrofitClient.apiService.archiveEntry(token, entryId)

    suspend fun loadCollections(token: String, entryId: String): List<EntryCollection> = RetrofitClient.apiService.getEntryCollections(token, entryId)

    suspend fun createCollection(token: String, entryId: String, request: CollectionRequest): EntryCollection =
        RetrofitClient.apiService.createCollection(token, entryId, request)

    suspend fun archiveCollection(token: String, collectionId: String) = RetrofitClient.apiService.archiveCollection(token, collectionId, ArchiveRequest(""))

    suspend fun addEntryPenalty(token: String, entryId: String, request: PenaltyRequest): EntryPenalty =
        RetrofitClient.apiService.addEntryPenalty(token, entryId, request)

    suspend fun uploadCollectionProof(token: String, entryId: String, collectionId: String, file: MultipartBody.Part): Response<ResponseBody> =
        RetrofitClient.apiService.uploadCollectionProof(token, entryId, collectionId, file)

    suspend fun getCollectionProof(token: String, entryId: String, collectionId: String): Response<ResponseBody> =
        RetrofitClient.apiService.getCollectionProof(token, entryId, collectionId)

    suspend fun uploadEntryProof(token: String, entryId: String, file: MultipartBody.Part): Response<ResponseBody> =
        RetrofitClient.apiService.uploadEntryProof(token, entryId, file)
}