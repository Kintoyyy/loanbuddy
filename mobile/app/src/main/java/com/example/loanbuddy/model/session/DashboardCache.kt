package com.example.loanbuddy.model.session

import android.content.Context
import com.example.loanbuddy.presenter.HomeSummary
import com.google.gson.Gson

object DashboardCache {

    private const val PREFS = "dashboard_cache"
    private const val KEY_DATA = "summary"
    private const val KEY_TS = "timestamp"
    private const val TTL_MS = 10 * 60 * 1000L // 10 minutes

    private val gson = Gson()

    fun save(context: Context, summary: HomeSummary) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(KEY_DATA, gson.toJson(summary))
            .putLong(KEY_TS, System.currentTimeMillis())
            .apply()
    }

    fun load(context: Context): HomeSummary? {
        val json = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_DATA, null) ?: return null
        return try {
            gson.fromJson(json, HomeSummary::class.java)
        } catch (_: Exception) {
            null
        }
    }

    fun isStale(context: Context): Boolean {
        val ts = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getLong(KEY_TS, 0L)
        return System.currentTimeMillis() - ts > TTL_MS
    }

    fun clear(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
    }
}
