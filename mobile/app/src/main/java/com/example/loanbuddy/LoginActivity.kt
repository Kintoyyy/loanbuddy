package com.example.loanbuddy

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.example.loanbuddy.api.RetrofitClient
import com.example.loanbuddy.data.LoginRequest
import com.example.loanbuddy.data.LoginResponse
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class LoginActivity : AppCompatActivity() {

    private lateinit var emailInput: EditText
    private lateinit var passwordInput: EditText
    private lateinit var loginButton: Button
    private lateinit var progressBar: ProgressBar
    private lateinit var registerLink: TextView
    private lateinit var backButton: Button
    private lateinit var registerButtonAlt: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_login)
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.login_container)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        emailInput = findViewById(R.id.email_input)
        passwordInput = findViewById(R.id.password_input)
        loginButton = findViewById(R.id.login_button)
        progressBar = findViewById(R.id.progress_bar)
        registerLink = findViewById(R.id.register_link)
        backButton = findViewById(R.id.back_button)
        registerButtonAlt = findViewById(R.id.register_button_alt)

        loginButton.setOnClickListener { performLogin() }
        registerLink.setOnClickListener {
            startActivity(Intent(this, RegisterActivity::class.java))
        }
        registerButtonAlt.setOnClickListener {
            startActivity(Intent(this, RegisterActivity::class.java))
        }
        backButton.setOnClickListener { finish() }
    }

    private fun performLogin() {
        val email = emailInput.text.toString().trim()
        val password = passwordInput.text.toString()

        if (email.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "Please enter email and password", Toast.LENGTH_SHORT).show()
            return
        }

        setLoading(true)

        RetrofitClient.apiService
            .login(LoginRequest(email, password))
            .enqueue(object : Callback<LoginResponse> {
                override fun onResponse(call: Call<LoginResponse>, response: Response<LoginResponse>) {
                    setLoading(false)
                    if (response.isSuccessful) {
                        val body = response.body()
                        val token = body?.access_token
                        if (token != null) {
                            AuthManager.saveSession(
                                this@LoginActivity,
                                token,
                                body.refresh_token ?: "",
                                body.user
                            )
                            navigateToHome()
                        } else {
                            Toast.makeText(this@LoginActivity, "Login failed: empty token", Toast.LENGTH_SHORT).show()
                        }
                    } else {
                        val msg = when (response.code()) {
                            400 -> "Invalid email or password"
                            422 -> "Invalid email format"
                            else -> "Login failed (${response.code()})"
                        }
                        Toast.makeText(this@LoginActivity, msg, Toast.LENGTH_SHORT).show()
                        passwordInput.text.clear()
                    }
                }

                override fun onFailure(call: Call<LoginResponse>, t: Throwable) {
                    setLoading(false)
                    Toast.makeText(this@LoginActivity, "Network error: ${t.message}", Toast.LENGTH_SHORT).show()
                }
            })
    }

    private fun navigateToHome() {
        val intent = Intent(this, HomeActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
    }

    private fun setLoading(loading: Boolean) {
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        loginButton.isEnabled = !loading
    }
}
