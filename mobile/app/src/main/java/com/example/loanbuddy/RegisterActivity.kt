package com.example.loanbuddy.view

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.loanbuddy.R
import com.example.loanbuddy.databinding.ActivityRegisterBinding
import com.example.loanbuddy.model.RegisterRequest
import com.example.loanbuddy.presenter.AuthPresenter
import kotlinx.coroutines.launch

class RegisterActivity : AppCompatActivity() {

    private lateinit var binding: ActivityRegisterBinding
    private val authPresenter = AuthPresenter()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityRegisterBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.registerButton.setOnClickListener { performRegister() }
        binding.loginLink.setOnClickListener { finish() }
    }

    private fun performRegister() {
        val firstName = binding.firstNameInput.text.toString().trim()
        val lastName = binding.lastNameInput.text.toString().trim()
        val email = binding.emailInput.text.toString().trim()
        val username = binding.usernameInput.text.toString().trim()
        val birthday = binding.birthdayInput.text.toString().trim()
        val password = binding.passwordInput.text.toString()
        val confirmPassword = binding.confirmPasswordInput.text.toString()

        if (firstName.isEmpty() || email.isEmpty() || username.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "Please fill in all required fields", Toast.LENGTH_SHORT).show()
            return
        }
        if (password != confirmPassword) {
            Toast.makeText(this, "Passwords do not match", Toast.LENGTH_SHORT).show()
            return
        }
        if (password.length < 6) {
            Toast.makeText(this, "Password must be at least 6 characters", Toast.LENGTH_SHORT).show()
            return
        }

        setLoading(true)

        val request = RegisterRequest(
            email = email,
            password = password,
            firstName = firstName,
            lastName = lastName,
            username = username,
            birthday = birthday.ifBlank { "2000-01-01" }
        )

        lifecycleScope.launch {
            try {
                authPresenter.register(request)
                Toast.makeText(
                    this@RegisterActivity,
                    "Account created! Please check your email to confirm, then log in.",
                    Toast.LENGTH_LONG
                ).show()
                finish()
            } catch (e: retrofit2.HttpException) {
                val msg = when (e.code()) {
                    409 -> "Email already registered"
                    400 -> "Invalid registration details"
                    else -> "Registration failed (${e.code()})"
                }
                Toast.makeText(this@RegisterActivity, msg, Toast.LENGTH_LONG).show()
            } catch (e: Exception) {
                Toast.makeText(this@RegisterActivity, "Network error: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                setLoading(false)
            }
        }
    }

    private fun setLoading(loading: Boolean) {
        binding.progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        binding.registerButton.isEnabled = !loading
    }
}
