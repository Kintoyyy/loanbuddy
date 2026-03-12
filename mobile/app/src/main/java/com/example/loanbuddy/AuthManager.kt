package com.example.loanbuddy

import android.content.Context
import android.content.SharedPreferences
import com.example.loanbuddy.data.UserData

object AuthManager {

    private const val PREFS_NAME = "loanbuddy_auth"
    private const val KEY_ACCESS_TOKEN = "access_token"
    private const val KEY_REFRESH_TOKEN = "refresh_token"
    private const val KEY_USER_ID = "user_id"
    private const val KEY_USER_EMAIL = "user_email"
    private const val KEY_USER_FULL_NAME = "user_full_name"
    private const val KEY_USER_ROLE = "user_role"

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun saveSession(
        context: Context,
        accessToken: String,
        refreshToken: String,
        user: UserData?
    ) {
        prefs(context).edit().apply {
            putString(KEY_ACCESS_TOKEN, accessToken)
            putString(KEY_REFRESH_TOKEN, refreshToken)
            putString(KEY_USER_ID, user?.id)
            putString(KEY_USER_EMAIL, user?.email)
            putString(KEY_USER_FULL_NAME, user?.user_metadata?.full_name ?: user?.email)
            // Role can be in app_metadata (set by admin/service) or user_metadata (set on sign-up)
            val role = user?.app_metadata?.role
                ?: user?.user_metadata?.role
                ?: user?.role
                ?: "user"
            putString(KEY_USER_ROLE, role)
            apply()
        }
    }

    fun getAccessToken(context: Context): String? =
        prefs(context).getString(KEY_ACCESS_TOKEN, null)

    fun getRefreshToken(context: Context): String? =
        prefs(context).getString(KEY_REFRESH_TOKEN, null)

    fun getUserEmail(context: Context): String? =
        prefs(context).getString(KEY_USER_EMAIL, null)

    fun getUserFullName(context: Context): String? =
        prefs(context).getString(KEY_USER_FULL_NAME, null)

    fun getUserRole(context: Context): String? =
        prefs(context).getString(KEY_USER_ROLE, "user")

    fun isAdmin(context: Context): Boolean =
        getUserRole(context) == "admin"

    fun isLoggedIn(context: Context): Boolean =
        getAccessToken(context) != null

    fun clearSession(context: Context) {
        prefs(context).edit().clear().apply()
    }
}
