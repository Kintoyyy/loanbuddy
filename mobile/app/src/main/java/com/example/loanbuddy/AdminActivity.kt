package com.example.loanbuddy

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class AdminActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_admin)

        val adminEmailView = findViewById<TextView>(R.id.admin_email_value)
        adminEmailView.text = AuthManager.getUserEmail(this) ?: "—"

        findViewById<View>(R.id.back_button).setOnClickListener { finish() }

        findViewById<View>(R.id.manage_loans_button).setOnClickListener {
            Toast.makeText(this, "Loan management coming soon", Toast.LENGTH_SHORT).show()
        }

        findViewById<View>(R.id.logout_button).setOnClickListener {
            AuthManager.clearSession(this)
            startActivity(Intent(this, LoginActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            })
        }
    }
}
