package com.example.loanbuddy

import android.app.DatePickerDialog
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.*
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.loanbuddy.adapter.LoanAdapter
import com.example.loanbuddy.api.RetrofitClient
import com.example.loanbuddy.data.*
import com.example.loanbuddy.databinding.ActivityLoansBinding
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.text.NumberFormat
import java.util.*

class LoansActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLoansBinding
    private lateinit var adapter: LoanAdapter
    private var allLoans = listOf<Loan>()
    private var filter = "all"
    private val fmt = NumberFormat.getNumberInstance(Locale("en", "PH"))

    private var pendingProofLoanId: String? = null
    private var pendingProofPaymentId: String? = null
    private var pendingProofDialog: AlertDialog? = null

    private val pickProofLauncher = registerForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri != null && pendingProofLoanId != null && pendingProofPaymentId != null) {
            uploadProof(uri, pendingProofLoanId!!, pendingProofPaymentId!!)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoansBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.backButton.setOnClickListener { finish() }
        binding.fabAddLoan.setOnClickListener { showLoanForm(null) }

        adapter = LoanAdapter(
            loans = emptyList(),
            onEdit = { showLoanForm(it) },
            onDelete = { confirmDelete(it) },
            onTogglePaid = { togglePaid(it) },
            onShowPayments = { showPaymentsDialog(it) }
        )
        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.recyclerView.adapter = adapter

        binding.filterAll.setOnClickListener { setFilter("all") }
        binding.filterActive.setOnClickListener { setFilter("active") }
        binding.filterPaid.setOnClickListener { setFilter("paid") }

        loadLoans()
    }

    private fun loadLoans() {
        val token = AuthManager.getBearerToken(this)
        binding.progressBar.visibility = View.VISIBLE
        lifecycleScope.launch {
            try {
                allLoans = RetrofitClient.apiService.getLoans(token)
                applyFilter()
                updateSummary()
            } catch (e: Exception) {
                Toast.makeText(this@LoansActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            } finally {
                binding.progressBar.visibility = View.GONE
            }
        }
    }

    private fun setFilter(f: String) {
        filter = f
        applyFilter()
        val active = android.graphics.Color.WHITE
        val inactive = android.graphics.Color.TRANSPARENT
        val activeText = getColor(R.color.white)
        val inactiveText = getColor(R.color.zinc_500)
        listOf(binding.filterAll to "all", binding.filterActive to "active", binding.filterPaid to "paid").forEach { (btn, key) ->
            btn.setBackgroundColor(if (key == filter) getColor(R.color.zinc_900) else inactive)
            btn.setTextColor(if (key == filter) activeText else inactiveText)
        }
    }

    private fun applyFilter() {
        val filtered = when (filter) {
            "active" -> allLoans.filter { it.status == "active" }
            "paid" -> allLoans.filter { it.status == "paid" }
            else -> allLoans
        }
        adapter.updateList(filtered)
        binding.emptyText.visibility = if (filtered.isEmpty()) View.VISIBLE else View.GONE
    }

    private fun updateSummary() {
        val total = allLoans.sumOf { it.amount }
        val outstanding = allLoans.sumOf { it.remaining_balance }
        val collected = total - outstanding
        binding.totalLent.text = "₱${fmt.format(total)}"
        binding.totalOutstanding.text = "₱${fmt.format(outstanding)}"
        binding.totalCollected.text = "₱${fmt.format(collected)}"
    }

    private fun showLoanForm(loan: Loan?) {
        val v = LayoutInflater.from(this).inflate(R.layout.dialog_loan_form, null)
        val borrowerInput = v.findViewById<EditText>(R.id.input_borrower)
        val amountInput = v.findViewById<EditText>(R.id.input_amount)
        val dateLentInput = v.findViewById<EditText>(R.id.input_date_lent)
        val dueDateInput = v.findViewById<EditText>(R.id.input_due_date)
        val interestInput = v.findViewById<EditText>(R.id.input_interest_rate)
        val penaltyInput = v.findViewById<EditText>(R.id.input_penalty_rate)
        val descInput = v.findViewById<EditText>(R.id.input_description)
        val freqSpinner = v.findViewById<Spinner>(R.id.spinner_frequency)

        val freqValues = arrayOf("none","weekly","semimonthly","monthly","quarterly")
        freqSpinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item,
            arrayOf("One-time","Weekly","Semi-Monthly","Monthly","Quarterly")).also {
            it.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        }

        loan?.let {
            borrowerInput.setText(it.borrower_name)
            amountInput.setText(it.amount.toString())
            dateLentInput.setText(it.date_lent)
            dueDateInput.setText(it.due_date ?: "")
            interestInput.setText(if (it.interest_rate > 0) it.interest_rate.toString() else "")
            penaltyInput.setText(if (it.penalty_rate > 0) it.penalty_rate.toString() else "")
            descInput.setText(it.description ?: "")
            freqSpinner.setSelection(freqValues.indexOf(it.payment_frequency).coerceAtLeast(0))
        } ?: run {
            dateLentInput.setText(today())
        }

        dateLentInput.setOnClickListener { pickDate { dateLentInput.setText(it) } }
        dueDateInput.setOnClickListener { pickDate { dueDateInput.setText(it) } }

        AlertDialog.Builder(this)
            .setTitle(if (loan == null) "Add Loan" else "Edit Loan")
            .setView(v)
            .setPositiveButton("Save") { _, _ ->
                val name = borrowerInput.text.toString().trim()
                val amount = amountInput.text.toString().toDoubleOrNull()
                val dateLent = dateLentInput.text.toString().trim()
                if (name.isEmpty() || amount == null || amount <= 0 || dateLent.isEmpty()) {
                    Toast.makeText(this, "Name, amount, and date are required", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                val request = LoanRequest(
                    borrowerName = name,
                    amount = amount,
                    description = descInput.text.toString().trim().ifBlank { null },
                    dateLent = dateLent,
                    dueDate = dueDateInput.text.toString().trim().ifBlank { null },
                    status = loan?.status,
                    interestRate = interestInput.text.toString().toDoubleOrNull() ?: 0.0,
                    paymentFrequency = freqValues[freqSpinner.selectedItemPosition],
                    penaltyRate = penaltyInput.text.toString().toDoubleOrNull() ?: 0.0
                )
                if (loan == null) createLoan(request) else updateLoan(loan.loan_id, request)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun createLoan(request: LoanRequest) {
        lifecycleScope.launch {
            try {
                RetrofitClient.apiService.createLoan(AuthManager.getBearerToken(this@LoansActivity), request)
                loadLoans()
                Toast.makeText(this@LoansActivity, "Loan added", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(this@LoansActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun updateLoan(loanId: String, request: LoanRequest) {
        lifecycleScope.launch {
            try {
                RetrofitClient.apiService.updateLoan(AuthManager.getBearerToken(this@LoansActivity), loanId, request)
                loadLoans()
            } catch (e: Exception) {
                Toast.makeText(this@LoansActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun confirmDelete(loan: Loan) {
        AlertDialog.Builder(this)
            .setTitle("Delete Loan")
            .setMessage("Delete loan for ${loan.borrower_name} and all payments?")
            .setPositiveButton("Delete") { _, _ ->
                lifecycleScope.launch {
                    try {
                        RetrofitClient.apiService.deleteLoan(AuthManager.getBearerToken(this@LoansActivity), loan.loan_id)
                        loadLoans()
                    } catch (e: Exception) {
                        Toast.makeText(this@LoansActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun togglePaid(loan: Loan) {
        val newStatus = if (loan.status == "active") "paid" else "active"
        val msg = if (newStatus == "paid") "Mark ${loan.borrower_name} as fully paid?" else "Reopen loan for ${loan.borrower_name}?"
        AlertDialog.Builder(this).setMessage(msg)
            .setPositiveButton("Confirm") { _, _ ->
                val req = LoanRequest(
                    borrowerName = loan.borrower_name,
                    amount = loan.amount,
                    description = loan.description,
                    dateLent = loan.date_lent,
                    dueDate = loan.due_date,
                    status = newStatus,
                    interestRate = loan.interest_rate,
                    paymentFrequency = loan.payment_frequency,
                    penaltyRate = loan.penalty_rate
                )
                updateLoan(loan.loan_id, req)
            }
            .setNegativeButton("Cancel", null).show()
    }

    private fun showPaymentsDialog(loan: Loan) {
        val payments = loan.loan_payments.sortedBy { it.payment_date }
        val v = LayoutInflater.from(this).inflate(R.layout.dialog_payments, null)
        val listView = v.findViewById<ListView>(R.id.payment_list)
        val addPaymentBtn = v.findViewById<Button>(R.id.btn_add_payment)
        val amountInput = v.findViewById<EditText>(R.id.input_amount)
        val dateInput = v.findViewById<EditText>(R.id.input_date)
        val noteInput = v.findViewById<EditText>(R.id.input_note)

        dateInput.setText(today())
        dateInput.setOnClickListener { pickDate { dateInput.setText(it) } }

        val items = payments.map { p ->
            val archived = if (p.is_archived) " [Archived]" else ""
            "₱${fmt.format(p.amount)} · ${formatDate(p.payment_date)}${archived}${if (!p.note.isNullOrBlank()) " · ${p.note}" else ""}"
        }
        listView.adapter = ArrayAdapter(this, android.R.layout.simple_list_item_1, items)

        listView.setOnItemLongClickListener { _, _, pos, _ ->
            val payment = payments[pos]
            if (!payment.is_archived) {
                val reasonInput = EditText(this).also { it.hint = "Archive reason (optional)" }
                AlertDialog.Builder(this)
                    .setTitle("Archive Payment?")
                    .setView(reasonInput)
                    .setPositiveButton("Archive") { _, _ ->
                        lifecycleScope.launch {
                            try {
                                RetrofitClient.apiService.archivePayment(
                                    AuthManager.getBearerToken(this@LoansActivity),
                                    loan.loan_id, payment.payment_id,
                                    ArchiveRequest(reasonInput.text.toString().trim())
                                )
                                loadLoans()
                                Toast.makeText(this@LoansActivity, "Payment archived", Toast.LENGTH_SHORT).show()
                            } catch (e: Exception) {
                                Toast.makeText(this@LoansActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                            }
                        }
                    }
                    .setNegativeButton("Cancel", null).show()
            }
            true
        }

        val dialog = AlertDialog.Builder(this)
            .setTitle("Payments — ${loan.borrower_name}")
            .setView(v)
            .setNegativeButton("Close", null)
            .create()

        addPaymentBtn.setOnClickListener {
            val amount = amountInput.text.toString().toDoubleOrNull()
            val date = dateInput.text.toString().trim()
            if (amount == null || amount <= 0 || date.isEmpty()) {
                Toast.makeText(this, "Amount and date are required", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            val req = LoanPaymentRequest(amount = amount, note = noteInput.text.toString().trim().ifBlank { null }, paymentDate = date)
            lifecycleScope.launch {
                try {
                    val created = RetrofitClient.apiService.addPayment(AuthManager.getBearerToken(this@LoansActivity), loan.loan_id, req)
                    pendingProofLoanId = loan.loan_id
                    pendingProofPaymentId = created.payment_id
                    pendingProofDialog = dialog
                    dialog.dismiss()
                    pickProofLauncher.launch("image/*")
                    loadLoans()
                } catch (e: Exception) {
                    Toast.makeText(this@LoansActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }

        dialog.show()
    }

    private fun uploadProof(uri: Uri, loanId: String, paymentId: String) {
        lifecycleScope.launch {
            try {
                val bytes = contentResolver.openInputStream(uri)?.readBytes() ?: return@launch
                val mime = contentResolver.getType(uri) ?: "image/jpeg"
                val body = bytes.toRequestBody(mime.toMediaType())
                val part = MultipartBody.Part.createFormData("file", "proof.jpg", body)
                RetrofitClient.apiService.uploadPaymentProof(AuthManager.getBearerToken(this@LoansActivity), loanId, paymentId, part)
                Toast.makeText(this@LoansActivity, "Proof uploaded", Toast.LENGTH_SHORT).show()
                loadLoans()
            } catch (e: Exception) {
                Toast.makeText(this@LoansActivity, "Proof upload failed: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun pickDate(onPick: (String) -> Unit) {
        val cal = Calendar.getInstance()
        DatePickerDialog(this, { _, y, m, d ->
            onPick(String.format("%04d-%02d-%02d", y, m + 1, d))
        }, cal.get(Calendar.YEAR), cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH)).show()
    }

    private fun today() = java.time.LocalDate.now().toString()

    private fun formatDate(d: String?): String {
        if (d == null) return "—"
        return try {
            val parts = d.split("-")
            val months = arrayOf("Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec")
            "${months[parts[1].toInt() - 1]} ${parts[2].toInt()}, ${parts[0]}"
        } catch (_: Exception) { d }
    }
}
