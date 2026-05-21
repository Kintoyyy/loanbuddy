package com.example.loanbuddy.view

import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.example.loanbuddy.BottomNavHelper
import com.example.loanbuddy.R
import com.example.loanbuddy.databinding.ActivityCalculatorBinding
import com.example.loanbuddy.presenter.CalculatorPresenter

class CalculatorActivity : AppCompatActivity() {

    private lateinit var binding: ActivityCalculatorBinding
    private var activeTab = "simple"
    private val calculatorPresenter = CalculatorPresenter()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCalculatorBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.backButton.setOnClickListener { finish() }
        BottomNavHelper.setup(this, BottomNavHelper.NAV_CALC)

        binding.tabSimple.setOnClickListener { setTab("simple") }
        binding.tabCompound.setOnClickListener { setTab("compound") }
        binding.tabEmi.setOnClickListener { setTab("emi") }

        binding.calculateButton.setOnClickListener { calculate() }

        setTab("simple")
    }

    private fun setTab(tab: String) {
        activeTab = tab
        val activeColor = getColor(R.color.zinc_900)
        val inactiveColor = android.graphics.Color.TRANSPARENT
        val activeTextColor = getColor(R.color.white)
        val inactiveTextColor = getColor(R.color.zinc_500)

        listOf(binding.tabSimple to "simple", binding.tabCompound to "compound", binding.tabEmi to "emi").forEach { (btn, key) ->
            btn.setBackgroundColor(if (key == tab) activeColor else inactiveColor)
            btn.setTextColor(if (key == tab) activeTextColor else inactiveTextColor)
        }

        when (tab) {
            "simple" -> {
                binding.labelTime.text = "Time (years)"
                binding.compoundFreqRow.visibility = android.view.View.GONE
                binding.loanTermRow.visibility = android.view.View.GONE
            }
            "compound" -> {
                binding.labelTime.text = "Time (years)"
                binding.compoundFreqRow.visibility = android.view.View.VISIBLE
                binding.loanTermRow.visibility = android.view.View.GONE
            }
            "emi" -> {
                binding.labelTime.text = "Monthly Rate (%)"
                binding.compoundFreqRow.visibility = android.view.View.GONE
                binding.loanTermRow.visibility = android.view.View.VISIBLE
            }
        }

        binding.resultCard.visibility = android.view.View.GONE
    }

    private fun calculate() {
        val principal = binding.inputPrincipal.text.toString().toDoubleOrNull()
        val rate = binding.inputRate.text.toString().toDoubleOrNull()
        val time = binding.inputTime.text.toString().toDoubleOrNull()

        if (principal == null || rate == null) {
            Toast.makeText(this, "Please fill in all required fields", Toast.LENGTH_SHORT).show()
            return
        }

        when (activeTab) {
            "simple" -> {
                if (time == null) { Toast.makeText(this, "Time required", Toast.LENGTH_SHORT).show(); return }
                val (interest, total) = calculatorPresenter.simpleInterest(principal, rate, time)
                showResult(
                    "Interest: ₱${fmt(interest)}\nTotal Amount: ₱${fmt(total)}"
                )
            }
            "compound" -> {
                if (time == null) { Toast.makeText(this, "Time required", Toast.LENGTH_SHORT).show(); return }
                val n = binding.inputFreq.text.toString().toDoubleOrNull() ?: 12.0
                val (interest, amount) = calculatorPresenter.compoundInterest(principal, rate, time, n)
                showResult(
                    "Compound Interest: ₱${fmt(interest)}\nFinal Amount: ₱${fmt(amount)}"
                )
            }
            "emi" -> {
                val months = binding.inputMonths.text.toString().toDoubleOrNull()
                if (months == null || months <= 0) { Toast.makeText(this, "Loan term required", Toast.LENGTH_SHORT).show(); return }
                val (emi, totalInterest, totalPayment) = calculatorPresenter.emi(principal, rate, months)
                showResult(
                    "Monthly Payment: ₱${fmt(emi)}\nTotal Interest: ₱${fmt(totalInterest)}\nTotal Payment: ₱${fmt(totalPayment)}"
                )
            }
        }
    }

    private fun showResult(text: String) {
        binding.resultText.text = text
        binding.resultCard.visibility = android.view.View.VISIBLE
    }

    private fun fmt(n: Double): String {
        return String.format("%,.2f", n)
    }
}
