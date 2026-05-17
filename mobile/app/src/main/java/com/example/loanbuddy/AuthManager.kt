package com.example.loanbuddy

import android.content.Context
import android.content.SharedPreferences

object AuthManager {

    private const val PREFS_NAME = "loanbuddy_auth"
    private const val KEY_ACCESS_TOKEN = "access_token"
    private const val KEY_REFRESH_TOKEN = "refresh_token"
    private const val KEY_USER_ID = "user_id"
    private const val KEY_USER_EMAIL = "user_email"
    private const val KEY_FIRST_NAME = "first_name"
    private const val KEY_LAST_NAME = "last_name"
    private const val KEY_USERNAME = "username"

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun saveSession(
        context: Context,
        accessToken: String,
        refreshToken: String,
        userId: String?,
        email: String?
    ) {
        prefs(context).edit().apply {
            putString(KEY_ACCESS_TOKEN, accessToken)
            putString(KEY_REFRESH_TOKEN, refreshToken)
            putString(KEY_USER_ID, userId)
            putString(KEY_USER_EMAIL, email)
            apply()
        }
    }

    fun saveProfile(context: Context, firstName: String?, lastName: String?, username: String?) {
        prefs(context).edit().apply {
            putString(KEY_FIRST_NAME, firstName)
            putString(KEY_LAST_NAME, lastName)
            putString(KEY_USERNAME, username)
            apply()
        }
    }

    fun getAccessToken(context: Context): String? =
        prefs(context).getString(KEY_ACCESS_TOKEN, null)

    fun getBearerToken(context: Context): String =
        "Bearer ${getAccessToken(context) ?: ""}"

    fun getRefreshToken(context: Context): String? =
        prefs(context).getString(KEY_REFRESH_TOKEN, null)

    fun getUserId(context: Context): String? =
        prefs(context).getString(KEY_USER_ID, null)

    fun getUserEmail(context: Context): String? =
        prefs(context).getString(KEY_USER_EMAIL, null)

    fun getFirstName(context: Context): String? =
        prefs(context).getString(KEY_FIRST_NAME, null)

    fun getLastName(context: Context): String? =
        prefs(context).getString(KEY_LAST_NAME, null)

    fun getUsername(context: Context): String? =
        prefs(context).getString(KEY_USERNAME, null)

    fun getDisplayName(context: Context): String {
        val first = getFirstName(context)
        val last = getLastName(context)
        return when {
            !first.isNullOrBlank() -> "$first ${last ?: ""}".trim()
            !getUsername(context).isNullOrBlank() -> getUsername(context)!!
            else -> getUserEmail(context) ?: "User"
        }
    }

    fun isLoggedIn(context: Context): Boolean =
        getAccessToken(context) != null

    fun clearSession(context: Context) {
        prefs(context).edit().clear().apply()
    }
}
