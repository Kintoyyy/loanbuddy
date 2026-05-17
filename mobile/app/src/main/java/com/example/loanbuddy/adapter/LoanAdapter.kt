package com.example.loanbuddy.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.example.loanbuddy.data.Loan
import com.example.loanbuddy.databinding.ItemLoanBinding
import java.text.NumberFormat
import java.util.Locale

class LoanAdapter(
    private var loans: List<Loan>,
    private val onEdit: (Loan) -> Unit,
    private val onDelete: (Loan) -> Unit = {},
    private val onTogglePaid: (Loan) -> Unit,
    private val onShowPayments: (Loan) -> Unit
) : RecyclerView.Adapter<LoanAdapter.ViewHolder>() {

    private val fmt = NumberFormat.getNumberInstance(Locale("en", "PH"))

    inner class ViewHolder(val binding: ItemLoanBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemLoanBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val loan = loans[position]
        val b = holder.binding

        b.borrowerName.text = loan.borrower_name
        b.loanAmount.text = "₱${fmt.format(loan.amount)}"
        b.remaining.text = "₱${fmt.format(loan.remaining_balance)} left"

        val isOverdue = loan.status == "active" && loan.due_date != null &&
                loan.due_date < java.time.LocalDate.now().toString()

        val statusText = when {
            loan.status == "paid" -> "Paid"
            isOverdue -> "Overdue"
            else -> "Active"
        }
        b.statusBadge.text = statusText
        val ctx = holder.itemView.context
        b.statusBadge.setTextColor(
            when {
                loan.status == "paid" -> ctx.getColor(com.example.loanbuddy.R.color.emerald_700)
                isOverdue -> ctx.getColor(com.example.loanbuddy.R.color.rose_700)
                else -> ctx.getColor(com.example.loanbuddy.R.color.amber_700)
            }
        )
        b.statusBadge.setBackgroundColor(
            when {
                loan.status == "paid" -> ctx.getColor(com.example.loanbuddy.R.color.emerald_100)
                isOverdue -> ctx.getColor(com.example.loanbuddy.R.color.rose_100)
                else -> ctx.getColor(com.example.loanbuddy.R.color.amber_100)
            }
        )

        val paidPct = if (loan.amount > 0) ((loan.paid_amount / loan.amount) * 100).toInt().coerceIn(0, 100) else 0
        b.progressBar.progress = paidPct

        b.dateLent.text = formatDate(loan.date_lent)
        if (loan.due_date != null) {
            b.dueDate.text = "Due ${formatDate(loan.due_date)}"
            b.dueDate.visibility = android.view.View.VISIBLE
        } else {
            b.dueDate.visibility = android.view.View.GONE
        }

        b.btnEdit.setOnClickListener { onEdit(loan) }
        b.btnTogglePaid.setOnClickListener { onTogglePaid(loan) }
        b.btnPayments.setOnClickListener { onShowPayments(loan) }
        b.btnTogglePaid.text = if (loan.status == "paid") "Reopen" else "Paid"
    }

    override fun getItemCount() = loans.size

    fun updateList(newLoans: List<Loan>) {
        loans = newLoans
        notifyDataSetChanged()
    }

    private fun formatDate(d: String?): String {
        if (d == null) return "—"
        return try {
            val parts = d.split("-")
            val months = arrayOf("Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec")
            "${months[parts[1].toInt() - 1]} ${parts[2].toInt()}, ${parts[0]}"
        } catch (_: Exception) { d }
    }
}
