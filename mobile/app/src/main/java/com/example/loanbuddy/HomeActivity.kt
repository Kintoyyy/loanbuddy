package com.example.loanbuddy

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class HomeActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_home)
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.home_container)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        if (!AuthManager.isLoggedIn(this)) {
            redirectToLogin()
            return
        }

        val name = AuthManager.getUserFullName(this) ?: AuthManager.getUserEmail(this) ?: "User"
        val isAdmin = AuthManager.isAdmin(this)

        findViewById<TextView>(R.id.welcome_message).text = getString(R.string.welcome_message, name)

        val roleBadge = findViewById<TextView>(R.id.role_badge)
        if (isAdmin) {
            roleBadge.text = getString(R.string.role_admin)
            roleBadge.setBackgroundResource(R.drawable.bg_badge_admin)
            roleBadge.setTextColor(getColor(R.color.white))
        } else {
            roleBadge.text = getString(R.string.role_user)
            roleBadge.setBackgroundResource(R.drawable.bg_badge_user)
            roleBadge.setTextColor(getColor(R.color.zinc_700))
        }

        val adminCard = findViewById<View>(R.id.admin_button)
        adminCard.visibility = if (isAdmin) View.VISIBLE else View.GONE

        findViewById<View>(R.id.profile_button).setOnClickListener {
            startActivity(Intent(this, ProfileActivity::class.java))
        }

        adminCard.setOnClickListener {
            startActivity(Intent(this, AdminActivity::class.java))
        }

        findViewById<View>(R.id.logout_button).setOnClickListener {
            AlertDialog.Builder(this)
                .setTitle(R.string.logout_title)
                .setMessage(R.string.logout_confirm)
                .setPositiveButton(R.string.logout_yes) { _, _ ->
                    AuthManager.clearSession(this)
                    redirectToLogin()
                }
                .setNegativeButton(R.string.cancel, null)
                .show()
        }
    }

    private fun redirectToLogin() {
        val intent = Intent(this, LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
    }
}
