package com.example.loanbuddy.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.example.loanbuddy.model.Entry
import com.example.loanbuddy.databinding.ItemEntryBinding
import java.text.NumberFormat
import java.util.Locale

class EntryAdapter(
    private var entries: List<Entry>,
    private val onEdit: (Entry) -> Unit,
    private val onArchive: (Entry) -> Unit,
    private val onShowCollections: (Entry) -> Unit
) : RecyclerView.Adapter<EntryAdapter.ViewHolder>() {

    private val fmt = NumberFormat.getNumberInstance(Locale("en", "PH"))

    inner class ViewHolder(val binding: ItemEntryBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemEntryBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val entry = entries[position]
        val b = holder.binding
        val ctx = holder.itemView.context

        b.debtorName.text = entry.debtor_name
        b.originalAmount.text = "₱${fmt.format(entry.original_amount)} ${entry.currency}"
        val owed = entry.still_owed ?: entry.original_amount
        b.stillOwed.text = "₱${fmt.format(owed)} owed"

        val statusColor = when (entry.entry_status) {
            "Closed" -> com.example.loanbuddy.R.color.emerald_700
            "Partially Collected" -> com.example.loanbuddy.R.color.amber_700
            else -> com.example.loanbuddy.R.color.sky_700
        }
        val statusBg = when (entry.entry_status) {
            "Closed" -> com.example.loanbuddy.R.color.emerald_100
            "Partially Collected" -> com.example.loanbuddy.R.color.amber_100
            else -> com.example.loanbuddy.R.color.sky_100
        }
        b.statusBadge.text = entry.entry_status
        b.statusBadge.setTextColor(ctx.getColor(statusColor))
        b.statusBadge.setBackgroundColor(ctx.getColor(statusBg))

        val collected = entry.total_collected ?: 0.0
        val pct = if (entry.original_amount > 0) ((collected / entry.original_amount) * 100).toInt().coerceIn(0, 100) else 0
        b.progressBar.progress = pct

        b.lendingDate.text = formatDate(entry.lending_date)

        b.btnEdit.setOnClickListener { onEdit(entry) }
        b.btnArchive.setOnClickListener { onArchive(entry) }
        b.btnCollections.setOnClickListener { onShowCollections(entry) }
    }

    override fun getItemCount() = entries.size

    fun updateList(newEntries: List<Entry>) {
        entries = newEntries
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
