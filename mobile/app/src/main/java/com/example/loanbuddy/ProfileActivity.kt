package com.example.loanbuddy

import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.example.loanbuddy.api.RetrofitClient
import com.example.loanbuddy.data.UserData
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class ProfileActivity : AppCompatActivity() {

    private lateinit var nameValue: TextView
    private lateinit var emailValue: TextView
    private lateinit var roleValue: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var refreshButton: Button
    private lateinit var backButton: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_profile)
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.profile_container)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        nameValue = findViewById(R.id.name_value)
        emailValue = findViewById(R.id.email_value)
        roleValue = findViewById(R.id.role_value)
        progressBar = findViewById(R.id.progress_bar)
        refreshButton = findViewById(R.id.refresh_button)
        backButton = findViewById(R.id.back_button)

        // Load cached data immediately
        loadCachedProfile()

        refreshButton.setOnClickListener { fetchProfileFromServer() }
        backButton.setOnClickListener { finish() }
    }

    private fun loadCachedProfile() {
        nameValue.text = AuthManager.getUserFullName(this) ?: "—"
        emailValue.text = AuthManager.getUserEmail(this) ?: "—"
        roleValue.text = AuthManager.getUserRole(this) ?: "user"
    }

    private fun fetchProfileFromServer() {
        val token = AuthManager.getAccessToken(this) ?: return

        progressBar.visibility = View.VISIBLE
        refreshButton.isEnabled = false

        RetrofitClient.apiService.getCurrentUser("Bearer $token")
            .enqueue(object : Callback<UserData> {
                override fun onResponse(call: Call<UserData>, response: Response<UserData>) {
                    progressBar.visibility = View.GONE
                    refreshButton.isEnabled = true
                    if (response.isSuccessful) {
                        val user = response.body()
                        if (user != null) {
                            nameValue.text = user.user_metadata?.full_name ?: user.email ?: "—"
                            emailValue.text = user.email ?: "—"
                            roleValue.text = user.app_metadata?.role
                                ?: user.user_metadata?.role
                                ?: user.role
                                ?: "user"
                            // Persist updated info
                            AuthManager.saveSession(
                                this@ProfileActivity,
                                AuthManager.getAccessToken(this@ProfileActivity) ?: "",
                                AuthManager.getRefreshToken(this@ProfileActivity) ?: "",
                                user
                            )
                        }
                    } else if (response.code() == 401) {
                        Toast.makeText(this@ProfileActivity, "Session expired. Please log in again.", Toast.LENGTH_LONG).show()
                    } else {
                        Toast.makeText(this@ProfileActivity, "Failed to load profile (${response.code()})", Toast.LENGTH_SHORT).show()
                    }
                }

                override fun onFailure(call: Call<UserData>, t: Throwable) {
                    progressBar.visibility = View.GONE
                    refreshButton.isEnabled = true
                    Toast.makeText(this@ProfileActivity, "Network error: ${t.message}", Toast.LENGTH_SHORT).show()
                }
            })
    }
}
