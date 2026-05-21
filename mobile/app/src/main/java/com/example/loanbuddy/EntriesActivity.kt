package com.example.loanbuddy

import android.app.DatePickerDialog
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.*
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.RequiresApi
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.loanbuddy.adapter.EntryAdapter
import com.example.loanbuddy.databinding.ActivityEntriesBinding
import com.example.loanbuddy.model.*
import com.example.loanbuddy.model.session.AuthManager
import com.example.loanbuddy.presenter.EntriesPresenter
import com.example.loanbuddy.ui.SignaturePadView
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.text.NumberFormat
import java.time.LocalDate
import java.util.*

class EntriesActivity : AppCompatActivity() {

    private lateinit var binding: ActivityEntriesBinding
    private lateinit var adapter: EntryAdapter
    private var allEntries = listOf<Entry>()
    private var debtors = listOf<Debtor>()
    private var filter = "all"
    private val fmt = NumberFormat.getNumberInstance(Locale("en", "PH"))

    private var pendingProofEntryId: String? = null
    private var pendingProofCollectionId: String? = null
    private val entriesPresenter = EntriesPresenter()

    private val pickProofLauncher = registerForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri != null && pendingProofEntryId != null && pendingProofCollectionId != null) {
            uploadCollectionProofFromUri(uri, pendingProofEntryId!!, pendingProofCollectionId!!)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityEntriesBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.backButton.setOnClickListener { finish() }
        binding.fabAddEntry.setOnClickListener { showEntryForm(null) }
        BottomNavHelper.setup(this, BottomNavHelper.NAV_ENTRIES)

        adapter = EntryAdapter(
            entries = emptyList(),
            onEdit = { showEntryForm(it) },
            onArchive = { confirmArchive(it) },
            onShowCollections = { showCollectionsDialog(it) }
        )
        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.recyclerView.adapter = adapter

        binding.filterAll.setOnClickListener { setFilter("all") }
        binding.filterOpen.setOnClickListener { setFilter("open") }
        binding.filterPartial.setOnClickListener { setFilter("partial") }
        binding.filterClosed.setOnClickListener { setFilter("closed") }

        binding.swipeRefresh.setColorSchemeResources(R.color.zinc_900)
        binding.swipeRefresh.setOnRefreshListener { loadData() }

        loadData()
    }

    private fun loadData() {
        val token = AuthManager.getBearerToken(this)
        binding.progressBar.visibility = View.VISIBLE
        lifecycleScope.launch {
            try {
                val summary = entriesPresenter.loadSummary(token)
                allEntries = summary.entries
                debtors = summary.debtors
                applyFilter()
                updateSummary()
            } catch (e: Exception) {
                Toast.makeText(this@EntriesActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            } finally {
                binding.progressBar.visibility = View.GONE
                binding.swipeRefresh.isRefreshing = false
            }
        }
    }

    private fun setFilter(f: String) {
        filter = f
        applyFilter()
        listOf(
            binding.filterAll to "all",
            binding.filterOpen to "open",
            binding.filterPartial to "partial",
            binding.filterClosed to "closed"
        ).forEach { (btn, key) ->
            btn.setBackgroundColor(if (key == filter) getColor(R.color.zinc_900) else Color.TRANSPARENT)
            btn.setTextColor(if (key == filter) getColor(R.color.white) else getColor(R.color.zinc_500))
        }
    }

    private fun applyFilter() {
        val active = allEntries.filter { !it.is_archived }
        val filtered = when (filter) {
            "open" -> active.filter { it.entry_status == "Open" }
            "partial" -> active.filter { it.entry_status == "Partially Collected" }
            "closed" -> active.filter { it.entry_status == "Closed" }
            else -> active
        }
        adapter.updateList(filtered)
        binding.emptyText.visibility = if (filtered.isEmpty()) View.VISIBLE else View.GONE
    }

    private fun updateSummary() {
        val active = allEntries.filter { !it.is_archived }
        val totalOwed = active.sumOf { it.still_owed ?: it.original_amount }
        val totalCollected = active.sumOf { it.total_collected ?: 0.0 }
        binding.totalOwed.text = "₱${fmt.format(totalOwed)}"
        binding.totalCollected.text = "₱${fmt.format(totalCollected)}"
        binding.openCount.text = "${active.count { it.entry_status == "Open" }} open"
    }

    private fun showEntryForm(entry: Entry?) {
        val v = LayoutInflater.from(this).inflate(R.layout.dialog_entry_form, null)
        val amountInput = v.findViewById<EditText>(R.id.input_amount)
        val lendingDateInput = v.findViewById<EditText>(R.id.input_lending_date)
        val paybackDateInput = v.findViewById<EditText>(R.id.input_payback_date)
        val notesInput = v.findViewById<EditText>(R.id.input_notes)
        val penaltyRateInput = v.findViewById<EditText>(R.id.input_penalty_rate)
        val debtorDropdown = v.findViewById<AutoCompleteTextView>(R.id.dropdown_debtor)

        val activeDebtors = debtors.filter { !it.is_archived }
        val debtorNames = activeDebtors.map { it.debtor_name }.toTypedArray()
        debtorDropdown.setAdapter(ArrayAdapter(this, R.layout.item_dropdown, debtorNames))

        entry?.let {
            amountInput.setText(it.original_amount.toString())
            lendingDateInput.setText(it.lending_date)
            paybackDateInput.setText(it.expected_payback_date ?: "")
            notesInput.setText(it.notes ?: "")
            penaltyRateInput.setText(if (it.penalty_rate > 0) it.penalty_rate.toString() else "")
            val idx = activeDebtors.indexOfFirst { d -> d.debtor_id == it.debtor_id }
            if (idx >= 0) debtorDropdown.setText(debtorNames[idx], false)
        } ?: run {
            lendingDateInput.setText(today())
            if (debtorNames.isNotEmpty()) debtorDropdown.setText(debtorNames[0], false)
        }

        lendingDateInput.setOnClickListener { pickDate { lendingDateInput.setText(it) } }
        paybackDateInput.setOnClickListener { pickDate { paybackDateInput.setText(it) } }

        AlertDialog.Builder(this)
            .setTitle(if (entry == null) "Add Entry" else "Edit Entry")
            .setView(v)
            .setPositiveButton("Save") { _, _ ->
                val amount = amountInput.text.toString().toDoubleOrNull()
                val date = lendingDateInput.text.toString().trim()
                if (amount == null || amount <= 0 || date.isEmpty()) {
                    Toast.makeText(this, "Amount and date are required", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                if (activeDebtors.isEmpty()) {
                    Toast.makeText(this, "Add a debtor first", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                val selectedName = debtorDropdown.text.toString()
                val debtorIdx = debtorNames.indexOf(selectedName).coerceAtLeast(0)
                val request = EntryRequest(
                    debtor_id = activeDebtors[debtorIdx].debtor_id,
                    original_amount = amount,
                    currency = "PHP",
                    lending_date = date,
                    expected_payback_date = paybackDateInput.text.toString().trim().ifBlank { null },
                    notes = notesInput.text.toString().trim().ifBlank { null },
                    penaltyRate = penaltyRateInput.text.toString().toDoubleOrNull() ?: 0.0
                )
                if (entry == null) createEntry(request) else updateEntry(entry.entry_id, request)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun createEntry(request: EntryRequest) {
        lifecycleScope.launch {
            try {
                entriesPresenter.createEntry(AuthManager.getBearerToken(this@EntriesActivity), request)
                loadData()
                Toast.makeText(this@EntriesActivity, "Entry added", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(this@EntriesActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun updateEntry(entryId: String, request: EntryRequest) {
        lifecycleScope.launch {
            try {
                entriesPresenter.updateEntry(AuthManager.getBearerToken(this@EntriesActivity), entryId, request)
                loadData()
            } catch (e: Exception) {
                Toast.makeText(this@EntriesActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun confirmArchive(entry: Entry) {
        AlertDialog.Builder(this)
            .setMessage("Archive entry for ${entry.debtor_name}?")
            .setPositiveButton("Archive") { _, _ ->
                lifecycleScope.launch {
                    try {
                        entriesPresenter.archiveEntry(AuthManager.getBearerToken(this@EntriesActivity), entry.entry_id)
                        loadData()
                    } catch (e: Exception) {
                        Toast.makeText(this@EntriesActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showCollectionsDialog(entry: Entry) {
        val v = LayoutInflater.from(this).inflate(R.layout.dialog_collections, null)
        val listView = v.findViewById<ListView>(R.id.collection_list)
        val amountInput = v.findViewById<EditText>(R.id.input_amount)
        val dateInput = v.findViewById<EditText>(R.id.input_date)
        val notesInput = v.findViewById<EditText>(R.id.input_notes)
        val methodDropdown = v.findViewById<AutoCompleteTextView>(R.id.dropdown_method)
        val addBtn = v.findViewById<Button>(R.id.btn_add_collection)

        dateInput.setText(today())
        dateInput.setOnClickListener { pickDate { dateInput.setText(it) } }

        val methods = arrayOf("Cash", "Bank Transfer", "GCash", "PayMaya", "Check", "Online Transfer", "Card", "Other")
        methodDropdown.setAdapter(ArrayAdapter(this, R.layout.item_dropdown, methods))
        methodDropdown.setText(methods[0], false)

        val token = AuthManager.getBearerToken(this)
        var collections = listOf<EntryCollection>()

        fun refreshList() {
            lifecycleScope.launch {
                try {
                    collections = entriesPresenter.loadCollections(token, entry.entry_id)
                    val items = collections.sortedBy { it.collection_date }.map { c ->
                        val archived = if (c.is_archived) " [Archived]" else ""
                        "₱${fmt.format(c.amount_collected)} · ${formatDate(c.collection_date)} · ${c.payment_method}$archived"
                    }
                    listView.adapter = ArrayAdapter(this@EntriesActivity, android.R.layout.simple_list_item_1, items)
                } catch (_: Exception) {}
            }
        }
        refreshList()

        listView.setOnItemLongClickListener { _, _, pos, _ ->
            val col = collections.sortedBy { it.collection_date }[pos]
            if (!col.is_archived) {
                val reasonInput = EditText(this).also { it.hint = "Archive reason (optional)" }
                AlertDialog.Builder(this)
                    .setTitle("Archive Collection?")
                    .setView(reasonInput)
                    .setPositiveButton("Archive") { _, _ ->
                        lifecycleScope.launch {
                            try {
                                entriesPresenter.archiveCollection(token, col.collection_id)
                                refreshList()
                                loadData()
                            } catch (e: Exception) {
                                Toast.makeText(this@EntriesActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                            }
                        }
                    }
                    .setNegativeButton("Cancel", null).show()
            }
            true
        }

        val dialog = AlertDialog.Builder(this)
            .setTitle("Collections — ${entry.debtor_name}")
            .setView(v)
            .setNegativeButton("Close", null)
            .create()

        addBtn.setOnClickListener {
            val amount = amountInput.text.toString().toDoubleOrNull()
            val date = dateInput.text.toString().trim()
            if (amount == null || amount <= 0 || date.isEmpty()) {
                Toast.makeText(this, "Amount and date required", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            val selectedMethod = methodDropdown.text.toString().ifBlank { methods[0] }
            val req = CollectionRequest(
                amount_collected = amount,
                collection_date = date,
                payment_method = selectedMethod,
                notes = notesInput.text.toString().trim().ifBlank { null },
                transaction_id = null
            )
            lifecycleScope.launch {
                try {
                    val created = entriesPresenter.createCollection(token, entry.entry_id, req)
                    loadData()
                    showCollectionProofOptions(entry.entry_id, created.collection_id, dialog)
                } catch (e: Exception) {
                    Toast.makeText(this@EntriesActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }

        dialog.show()
    }

    private fun showCollectionProofOptions(entryId: String, collectionId: String, parentDialog: AlertDialog) {
        AlertDialog.Builder(this)
            .setTitle("Attach Proof?")
            .setItems(arrayOf("Choose Photo", "Draw Signature", "Skip")) { _, which ->
                when (which) {
                    0 -> {
                        pendingProofEntryId = entryId
                        pendingProofCollectionId = collectionId
                        parentDialog.dismiss()
                        pickProofLauncher.launch("image/*")
                    }
                    1 -> showSignatureForCollection(entryId, collectionId, parentDialog)
                    2 -> parentDialog.dismiss()
                }
            }
            .show()
    }

    private fun showSignatureForCollection(entryId: String, collectionId: String, parentDialog: AlertDialog) {
        val v = LayoutInflater.from(this).inflate(R.layout.dialog_signature, null)
        val pad = v.findViewById<SignaturePadView>(R.id.signature_pad)
        v.findViewById<Button>(R.id.btn_clear_sig).setOnClickListener { pad.clear() }

        AlertDialog.Builder(this)
            .setTitle("Draw Signature")
            .setView(v)
            .setPositiveButton("Save") { _, _ ->
                if (!pad.isEmpty()) {
                    lifecycleScope.launch {
                        try {
                            val body = pad.toByteArray().toRequestBody("image/png".toMediaType())
                            val part = MultipartBody.Part.createFormData("file", "signature.png", body)
                            entriesPresenter.uploadCollectionProof(AuthManager.getBearerToken(this@EntriesActivity), entryId, collectionId, part)
                            Toast.makeText(this@EntriesActivity, "Signature saved", Toast.LENGTH_SHORT).show()
                            parentDialog.dismiss()
                        } catch (e: Exception) {
                            Toast.makeText(this@EntriesActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            }
            .setNegativeButton("Skip", null)
            .show()
    }

    private fun uploadCollectionProofFromUri(uri: Uri, entryId: String, collectionId: String) {
        lifecycleScope.launch {
            try {
                val bytes = contentResolver.openInputStream(uri)?.readBytes() ?: return@launch
                val mime = contentResolver.getType(uri) ?: "image/jpeg"
                val body = bytes.toRequestBody(mime.toMediaType())
                val part = MultipartBody.Part.createFormData("file", "proof.jpg", body)
                entriesPresenter.uploadCollectionProof(AuthManager.getBearerToken(this@EntriesActivity), entryId, collectionId, part)
                Toast.makeText(this@EntriesActivity, "Proof uploaded", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(this@EntriesActivity, "Proof upload failed: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun pickDate(onPick: (String) -> Unit) {
        val cal = Calendar.getInstance()
        DatePickerDialog(this, { _, y, m, d ->
            onPick(String.format("%04d-%02d-%02d", y, m + 1, d))
        }, cal.get(Calendar.YEAR), cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH)).show()
    }

    @RequiresApi(Build.VERSION_CODES.O)
    private fun today() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        LocalDate.now().toString()
    } else {
        TODO("VERSION.SDK_INT < O")
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
