package com.example.loanbuddy

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.loanbuddy.api.RetrofitClient
import com.example.loanbuddy.databinding.ActivityHomeBinding
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.Locale

class HomeActivity : AppCompatActivity() {

    private lateinit var binding: ActivityHomeBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityHomeBinding.inflate(layoutInflater)
        setContentView(binding.root)

        if (!AuthManager.isLoggedIn(this)) {
            redirectToLogin()
            return
        }

        binding.welcomeMessage.text = getString(R.string.welcome_message, AuthManager.getDisplayName(this))

        binding.cardLoans.setOnClickListener { startActivity(Intent(this, LoansActivity::class.java)) }
        binding.cardDebtors.setOnClickListener { startActivity(Intent(this, DebtorsActivity::class.java)) }
        binding.cardEntries.setOnClickListener { startActivity(Intent(this, EntriesActivity::class.java)) }
        binding.cardCalculator.setOnClickListener { startActivity(Intent(this, CalculatorActivity::class.java)) }
        binding.cardProfile.setOnClickListener { startActivity(Intent(this, ProfileActivity::class.java)) }

        binding.logoutButton.setOnClickListener {
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

        loadStats()
    }

    override fun onResume() {
        super.onResume()
        loadStats()
    }

    private fun loadStats() {
        val token = AuthManager.getBearerToken(this)
        binding.statsProgress.visibility = View.VISIBLE

        lifecycleScope.launch {
            try {
                val entries = RetrofitClient.apiService.getEntries(token)
                val loans = RetrofitClient.apiService.getLoans(token)
                val debtors = RetrofitClient.apiService.getDebtors(token)

                val activeEntries = entries.filter { !it.is_archived }
                val totalOutstanding = activeEntries.sumOf { it.still_owed ?: it.original_amount }
                val totalCollected = activeEntries.sumOf { it.total_collected ?: 0.0 }
                val activeDebtors = debtors.count { !it.is_archived }
                val openEntries = activeEntries.count { it.entry_status == "Open" }

                val loanOutstanding = loans.sumOf { it.remaining_balance }

                val fmt = NumberFormat.getNumberInstance(Locale("en", "PH"))
                binding.statOutstanding.text = "₱${fmt.format(totalOutstanding + loanOutstanding)}"
                binding.statCollected.text = "₱${fmt.format(totalCollected)}"
                binding.statDebtors.text = activeDebtors.toString()
                binding.statOpenEntries.text = openEntries.toString()

            } catch (e: Exception) {
                Toast.makeText(this@HomeActivity, "Failed to load stats: ${e.message}", Toast.LENGTH_SHORT).show()
            } finally {
                binding.statsProgress.visibility = View.GONE
            }
        }
    }

    private fun redirectToLogin() {
        val intent = Intent(this, LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
    }
}
