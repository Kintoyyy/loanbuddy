package com.example.loanbuddy

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.TextView
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class AdminActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_admin)
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.admin_container)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        // Guard: only admins may access this screen
        if (!AuthManager.isAdmin(this)) {
            Toast.makeText(this, "Access denied: admin only", Toast.LENGTH_LONG).show()
            finish()
            return
        }

        val adminEmailView = findViewById<TextView>(R.id.admin_email_value)
        adminEmailView.text = AuthManager.getUserEmail(this) ?: "—"

        findViewById<View>(R.id.back_button).setOnClickListener { finish() }

        // Placeholder: navigate to loan management (extend as needed)
        findViewById<View>(R.id.manage_loans_button).setOnClickListener {
            Toast.makeText(this, "Loan management coming soon", Toast.LENGTH_SHORT).show()
        }

        // Logout action available from admin panel too
        findViewById<View>(R.id.logout_button).setOnClickListener {
            AuthManager.clearSession(this)
            val intent = Intent(this, LoginActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
        }
    }
}
