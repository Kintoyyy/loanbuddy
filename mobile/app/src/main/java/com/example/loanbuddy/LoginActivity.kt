package com.example.loanbuddy.view

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.loanbuddy.R
import com.example.loanbuddy.model.LoginRequest
import com.example.loanbuddy.model.session.AuthManager
import com.example.loanbuddy.presenter.AuthPresenter
import com.example.loanbuddy.presenter.ProfilePresenter
import com.example.loanbuddy.databinding.ActivityLoginBinding
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding
    private val authPresenter = AuthPresenter()
    private val profilePresenter = ProfilePresenter()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.loginButton.setOnClickListener { performLogin() }
        binding.registerLink.setOnClickListener {
            startActivity(Intent(this, RegisterActivity::class.java))
        }
    }

    private fun performLogin() {
        val email = binding.emailInput.text.toString().trim()
        val password = binding.passwordInput.text.toString()

        if (email.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "Please enter email and password", Toast.LENGTH_SHORT).show()
            return
        }

        setLoading(true)

        lifecycleScope.launch {
            try {
                val response = authPresenter.login(LoginRequest(email, password))
                val token = response.access_token
                if (token != null) {
                    AuthManager.saveSession(this@LoginActivity, token, response.refresh_token ?: "", response.user_id, email)
                    loadProfileAndNavigate(token)
                } else {
                    showError("Login failed: no token returned")
                }
            } catch (e: retrofit2.HttpException) {
                val msg = when (e.code()) {
                    400, 401 -> "Invalid email or password"
                    else -> "Login failed (${e.code()})"
                }
                showError(msg)
            } catch (e: Exception) {
                showError("Network error: ${e.message}")
            } finally {
                setLoading(false)
            }
        }
    }

    private suspend fun loadProfileAndNavigate(token: String) {
        try {
            val profile = profilePresenter.loadProfile("Bearer $token")
            AuthManager.saveProfile(this, profile.first_name, profile.last_name, profile.username)
        } catch (_: Exception) { /* profile load failure is non-fatal */ }
        navigateToHome()
    }

    private fun navigateToHome() {
        val intent = Intent(this, HomeActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
    }

    private fun showError(msg: String) {
        Toast.makeText(this, msg, Toast.LENGTH_LONG).show()
        binding.passwordInput.text?.clear()
    }

    private fun setLoading(loading: Boolean) {
        binding.progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        binding.loginButton.isEnabled = !loading
    }
}
