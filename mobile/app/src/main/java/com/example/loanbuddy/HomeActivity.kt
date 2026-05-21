package com.example.loanbuddy.view

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.loanbuddy.BottomNavHelper
import com.example.loanbuddy.EntriesActivity
import com.example.loanbuddy.databinding.ActivityHomeBinding
import com.example.loanbuddy.model.Entry
import com.example.loanbuddy.model.session.AuthManager
import com.example.loanbuddy.model.session.DashboardCache
import com.example.loanbuddy.presenter.HomeSummary
import com.example.loanbuddy.presenter.HomePresenter
import com.example.loanbuddy.ui.BarChartView
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.Calendar
import java.util.Locale

class HomeActivity : AppCompatActivity() {

    private lateinit var binding: ActivityHomeBinding
    private val fmt = NumberFormat.getNumberInstance(Locale("en", "PH"))
    private val homePresenter = HomePresenter()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityHomeBinding.inflate(layoutInflater)
        setContentView(binding.root)

        if (!AuthManager.isLoggedIn(this)) {
            redirectToLogin()
            return
        }

        val name = AuthManager.getDisplayName(this)
        binding.welcomeName.text = "Welcome back, $name"
        val initials = buildInitials(AuthManager.getFirstName(this), AuthManager.getLastName(this))
        binding.profileInitials.text = initials

        binding.profileAvatarBtn.setOnClickListener {
            startActivity(Intent(this, ProfileActivity::class.java))
        }
        binding.btnAddCollection.setOnClickListener {
            startActivity(Intent(this, EntriesActivity::class.java))
        }
        binding.btnViewLoans.setOnClickListener {
            startActivity(Intent(this, LoansActivity::class.java))
        }

        BottomNavHelper.setup(this, BottomNavHelper.NAV_HOME)
    }

    override fun onResume() {
        super.onResume()
        loadDashboard()
    }

    private fun loadDashboard() {
        val token = AuthManager.getBearerToken(this)

        // Render cached data immediately — zero perceived latency
        val cached = DashboardCache.load(this)
        if (cached != null) {
            renderSummary(cached)
            // Only show spinner when cache is stale (>10 min old)
            if (DashboardCache.isStale(this)) binding.statsProgress.visibility = View.VISIBLE
        } else {
            binding.statsProgress.visibility = View.VISIBLE
        }

        lifecycleScope.launch {
            try {
                val summary = homePresenter.loadSummary(token)
                DashboardCache.save(this@HomeActivity, summary)
                renderSummary(summary)
            } catch (e: Exception) {
                if (cached == null) {
                    Toast.makeText(this@HomeActivity, "Failed to load: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            } finally {
                binding.statsProgress.visibility = View.GONE
            }
        }
    }

    private fun renderSummary(summary: HomeSummary) {
        val entries = summary.entries
        val debtors = summary.debtors
        val loans = summary.loans

        val activeEntries = entries.filter { !it.is_archived }
        val totalOutstanding = activeEntries.sumOf { it.still_owed ?: it.original_amount }
        val totalCollected = activeEntries.sumOf { it.total_collected ?: 0.0 }
        val loanOutstanding = loans.sumOf { it.remaining_balance }
        val combinedOutstanding = totalOutstanding + loanOutstanding

        val activeDebtors = debtors.count { !it.is_archived }
        val openCount = activeEntries.count { it.entry_status == "Open" }
        val partialCount = activeEntries.count { it.entry_status == "Partially Collected" }
        val closedCount = activeEntries.count { it.entry_status == "Closed" }
        val totalOriginal = activeEntries.sumOf { it.original_amount }

        binding.portfolioOutstanding.text = "₱${fmt.format(combinedOutstanding)}"
        binding.portfolioSubtitle.text = "Outstanding balance across ${activeEntries.size} active entries"
        binding.statOutstanding.text = "₱${fmt.format(combinedOutstanding)}"
        binding.statCollected.text = "₱${fmt.format(totalCollected)}"
        binding.statDebtors.text = activeDebtors.toString()
        binding.statOpenEntries.text = openCount.toString()

        binding.countOpen.text = openCount.toString()
        binding.countPartial.text = partialCount.toString()
        binding.countClosed.text = closedCount.toString()

        val rate = if (totalOriginal > 0) (totalCollected / totalOriginal).toFloat() else 0f
        val ratePercent = (rate * 100).toInt()
        binding.circularProgress.progress = rate
        binding.circularProgress.centerText = "$ratePercent%"
        binding.collectionRateLabel.text = "${fmt.format(totalCollected)} of ${fmt.format(totalOriginal)} collected"

        binding.barChart.setData(buildChartData(activeEntries))
    }

    private fun buildChartData(entries: List<Entry>): List<BarChartView.MonthData> {
        val shortMonths = arrayOf("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
        return (5 downTo 0).map { offset ->
            val c = Calendar.getInstance().also { it.add(Calendar.MONTH, -offset) }
            val year = c.get(Calendar.YEAR)
            val month = c.get(Calendar.MONTH) + 1 // 1-12

            val monthEntries = entries.filter { entry ->
                runCatching {
                    val parts = entry.lending_date.split("-")
                    parts[0].toInt() == year && parts[1].toInt() == month
                }.getOrElse { false }
            }
            val lent = monthEntries.sumOf { it.original_amount }.toFloat()
            val collected = monthEntries.sumOf { it.total_collected ?: 0.0 }.toFloat()
            BarChartView.MonthData(shortMonths[month - 1], lent, collected)
        }
    }

    private fun buildInitials(first: String?, last: String?): String {
        val f = first?.firstOrNull()?.uppercaseChar()?.toString() ?: ""
        val l = last?.firstOrNull()?.uppercaseChar()?.toString() ?: ""
        return "$f$l".ifBlank { "?" }
    }

    private fun redirectToLogin() {
        startActivity(Intent(this, LoginActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        })
    }
}
