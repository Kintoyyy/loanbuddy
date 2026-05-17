package com.example.loanbuddy.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.example.loanbuddy.data.Debtor
import com.example.loanbuddy.databinding.ItemDebtorBinding
import java.text.NumberFormat
import java.util.Locale

class DebtorAdapter(
    private var debtors: List<Debtor>,
    private val onEdit: (Debtor) -> Unit,
    private val onArchive: (Debtor) -> Unit
) : RecyclerView.Adapter<DebtorAdapter.ViewHolder>() {

    private val fmt = NumberFormat.getNumberInstance(Locale("en", "PH"))

    inner class ViewHolder(val binding: ItemDebtorBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemDebtorBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val debtor = debtors[position]
        val b = holder.binding
        val ctx = holder.itemView.context

        b.debtorName.text = debtor.debtor_name
        b.debtorType.text = debtor.debtor_type
        b.totalOwed.text = "₱${fmt.format(debtor.total_owed ?: 0.0)}"
        b.openEntries.text = "${debtor.open_entries_count ?: 0} open entries"

        val typeColor = when (debtor.debtor_type) {
            "Person" -> com.example.loanbuddy.R.color.sky_600
            "Entity" -> com.example.loanbuddy.R.color.violet_600
            else -> com.example.loanbuddy.R.color.amber_600
        }
        b.debtorType.setTextColor(ctx.getColor(typeColor))

        if (debtor.is_archived) {
            b.archivedBadge.visibility = android.view.View.VISIBLE
            b.btnArchive.text = "Restore"
        } else {
            b.archivedBadge.visibility = android.view.View.GONE
            b.btnArchive.text = "Archive"
        }

        b.btnEdit.setOnClickListener { onEdit(debtor) }
        b.btnArchive.setOnClickListener { onArchive(debtor) }

        val initials = debtor.debtor_name.split(" ").take(2).joinToString("") { it.firstOrNull()?.toString() ?: "" }.uppercase()
        b.avatar.text = initials.ifEmpty { "?" }
    }

    override fun getItemCount() = debtors.size

    fun updateList(newDebtors: List<Debtor>) {
        debtors = newDebtors
        notifyDataSetChanged()
    }
}
