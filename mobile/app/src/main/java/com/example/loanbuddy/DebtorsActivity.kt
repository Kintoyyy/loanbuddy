package com.example.loanbuddy.view

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.loanbuddy.BottomNavHelper
import com.example.loanbuddy.R
import com.example.loanbuddy.adapter.DebtorAdapter
import com.example.loanbuddy.databinding.ActivityDebtorsBinding
import com.example.loanbuddy.model.Debtor
import com.example.loanbuddy.model.DebtorRequest
import com.example.loanbuddy.model.session.AuthManager
import com.example.loanbuddy.presenter.DebtorsPresenter
import kotlinx.coroutines.launch

class DebtorsActivity : AppCompatActivity() {

    private lateinit var binding: ActivityDebtorsBinding
    private lateinit var adapter: DebtorAdapter
    private var allDebtors = listOf<Debtor>()
    private var showArchived = false
    private val debtorsPresenter = DebtorsPresenter()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityDebtorsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.backButton.setOnClickListener { finish() }
        binding.fabAddDebtor.setOnClickListener { showDebtorForm(null) }
        BottomNavHelper.setup(this, BottomNavHelper.NAV_DEBTORS)
        binding.toggleArchived.setOnClickListener {
            showArchived = !showArchived
            binding.toggleArchived.text = if (showArchived) "Hide Archived" else "Show Archived"
            applyFilter()
        }

        adapter = DebtorAdapter(
            debtors = emptyList(),
            onEdit = { showDebtorForm(it) },
            onArchive = { confirmArchive(it) }
        )
        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.recyclerView.adapter = adapter

        binding.swipeRefresh.setColorSchemeResources(R.color.zinc_900)
        binding.swipeRefresh.setOnRefreshListener { loadDebtors() }

        loadDebtors()
    }

    private fun loadDebtors() {
        val token = AuthManager.getBearerToken(this)
        binding.progressBar.visibility = View.VISIBLE
        lifecycleScope.launch {
            try {
                allDebtors = debtorsPresenter.loadDebtors(token)
                applyFilter()
            } catch (e: Exception) {
                Toast.makeText(this@DebtorsActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            } finally {
                binding.progressBar.visibility = View.GONE
                binding.swipeRefresh.isRefreshing = false
            }
        }
    }

    private fun applyFilter() {
        val filtered = if (showArchived) allDebtors else allDebtors.filter { !it.is_archived }
        adapter.updateList(filtered)
        binding.emptyText.visibility = if (filtered.isEmpty()) View.VISIBLE else View.GONE
        binding.countText.text = "${filtered.size} debtor${if (filtered.size != 1) "s" else ""}"
    }

    private fun showDebtorForm(debtor: Debtor?) {
        val v = LayoutInflater.from(this).inflate(R.layout.dialog_debtor_form, null)
        val nameInput = v.findViewById<EditText>(R.id.input_name)
        val phoneInput = v.findViewById<EditText>(R.id.input_phone)
        val emailInput = v.findViewById<EditText>(R.id.input_email)
        val typeDropdown = v.findViewById<AutoCompleteTextView>(R.id.dropdown_type)

        val types = arrayOf("Person", "Entity", "Organization")
        typeDropdown.setAdapter(ArrayAdapter(this, R.layout.item_dropdown, types))

        debtor?.let {
            nameInput.setText(it.debtor_name)
            phoneInput.setText(it.phone_number ?: "")
            emailInput.setText(it.email ?: "")
            val idx = types.indexOf(it.debtor_type).coerceAtLeast(0)
            typeDropdown.setText(types[idx], false)
        } ?: run {
            typeDropdown.setText(types[0], false)
        }

        AlertDialog.Builder(this)
            .setTitle(if (debtor == null) "Add Debtor" else "Edit Debtor")
            .setView(v)
            .setPositiveButton("Save") { _, _ ->
                val name = nameInput.text.toString().trim()
                if (name.isEmpty()) {
                    Toast.makeText(this, "Name is required", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                val selectedType = typeDropdown.text.toString().ifBlank { types[0] }
                val request = DebtorRequest(
                    debtor_name = name,
                    debtor_type = selectedType,
                    phone_number = phoneInput.text.toString().trim().ifBlank { null },
                    email = emailInput.text.toString().trim().ifBlank { null }
                )
                if (debtor == null) createDebtor(request) else updateDebtor(debtor.debtor_id, request)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun createDebtor(request: DebtorRequest) {
        lifecycleScope.launch {
            try {
                debtorsPresenter.createDebtor(AuthManager.getBearerToken(this@DebtorsActivity), request)
                loadDebtors()
                Toast.makeText(this@DebtorsActivity, "Debtor added", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(this@DebtorsActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun updateDebtor(debtorId: String, request: DebtorRequest) {
        lifecycleScope.launch {
            try {
                debtorsPresenter.updateDebtor(AuthManager.getBearerToken(this@DebtorsActivity), debtorId, request)
                loadDebtors()
            } catch (e: Exception) {
                Toast.makeText(this@DebtorsActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun confirmArchive(debtor: Debtor) {
        val action = if (debtor.is_archived) "restore" else "archive"
        AlertDialog.Builder(this)
            .setMessage("$action ${debtor.debtor_name}?".replaceFirstChar { it.uppercase() })
            .setPositiveButton(action.replaceFirstChar { it.uppercase() }) { _, _ ->
                lifecycleScope.launch {
                    try {
                        debtorsPresenter.archiveDebtor(AuthManager.getBearerToken(this@DebtorsActivity), debtor.debtor_id)
                        loadDebtors()
                    } catch (e: Exception) {
                        Toast.makeText(this@DebtorsActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
}
