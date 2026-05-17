package com.example.loanbuddy.data

// ─── Auth ────────────────────────────────────────────────────────────────────

data class LoginRequest(
    val email: String,
    val password: String
)

data class LoginResponse(
    val message: String?,
    val access_token: String?,
    val refresh_token: String?,
    val token_type: String?,
    val expires_in: Int?,
    val user_id: String?
)

data class RegisterRequest(
    val email: String,
    val password: String,
    val firstName: String,
    val lastName: String,
    val username: String,
    val birthday: String
)

data class RegisterResponse(
    val message: String?,
    val user_id: String?,
    val email: String?
)

// ─── Profile ─────────────────────────────────────────────────────────────────

data class ProfileResponse(
    val user_id: String?,
    val email: String?,
    val first_name: String?,
    val last_name: String?,
    val username: String?,
    val birthday: String?,
    val phone: String?,
    val bio: String?,
    val photo_filename: String?,
    val photo_mime_type: String?,
    val created_at: String?,
    val updated_at: String?
)

data class UpdateProfileRequest(
    val firstName: String,
    val lastName: String,
    val username: String,
    val birthday: String,
    val phone: String,
    val bio: String
)

data class UpdateProfileResponse(
    val message: String?,
    val profile: ProfileResponse?
)

data class UpdatePasswordRequest(
    val currentPassword: String,
    val newPassword: String,
    val confirmPassword: String
)

data class MessageResponse(val message: String?)

// ─── Loans ────────────────────────────────────────────────────────────────────

data class LoanPenalty(
    val penalty_id: String,
    val loan_id: String,
    val amount: Double,
    val reason: String?,
    val penalty_date: String,
    val created_at: String
)

data class LoanPayment(
    val payment_id: String,
    val loan_id: String,
    val amount: Double,
    val note: String?,
    val payment_date: String,
    val proof_filename: String?,
    val proof_mime_type: String?,
    val is_archived: Boolean,
    val archive_reason: String?,
    val created_at: String
)

data class Loan(
    val loan_id: String,
    val lender_id: String,
    val borrower_name: String,
    val amount: Double,
    val description: String?,
    val date_lent: String,
    val due_date: String?,
    val status: String,
    val interest_rate: Double,
    val payment_frequency: String,
    val penalty_rate: Double,
    val created_at: String,
    val updated_at: String,
    val loan_payments: List<LoanPayment>,
    val loan_penalties: List<LoanPenalty>,
    val remaining_balance: Double,
    val paid_amount: Double,
    val total_penalties: Double
)

data class LoanRequest(
    val borrowerName: String,
    val amount: Double,
    val description: String?,
    val dateLent: String,
    val dueDate: String?,
    val status: String?,
    val interestRate: Double?,
    val paymentFrequency: String?,
    val penaltyRate: Double?
)

data class LoanPaymentRequest(
    val amount: Double,
    val note: String?,
    val paymentDate: String
)

data class ArchiveRequest(val reason: String)

data class PenaltyRequest(
    val amount: Double,
    val reason: String?,
    val penaltyDate: String
)

// ─── Debtors ─────────────────────────────────────────────────────────────────

data class Debtor(
    val debtor_id: String,
    val user_id: String,
    val debtor_name: String,
    val debtor_type: String,
    val phone_number: String?,
    val email: String?,
    val is_archived: Boolean,
    val created_at: String,
    val updated_at: String,
    val total_owed: Double?,
    val open_entries_count: Int?
)

data class DebtorRequest(
    val debtor_name: String,
    val debtor_type: String,
    val phone_number: String?,
    val email: String?
)

// ─── Entries ─────────────────────────────────────────────────────────────────

data class EntryPenalty(
    val penalty_id: String,
    val entry_id: String,
    val amount: Double,
    val reason: String?,
    val penalty_date: String,
    val created_at: String
)

data class Entry(
    val entry_id: String,
    val user_id: String,
    val debtor_id: String,
    val debtor_name: String,
    val original_amount: Double,
    val currency: String,
    val lending_date: String,
    val expected_payback_date: String?,
    val actual_closed_date: String?,
    val entry_status: String,
    val is_archived: Boolean,
    val notes: String?,
    val penalty_rate: Double,
    val created_at: String,
    val updated_at: String,
    val total_collected: Double?,
    val still_owed: Double?,
    val entry_penalties: List<EntryPenalty>?,
    val total_penalties: Double?
)

data class EntryRequest(
    val debtor_id: String,
    val original_amount: Double,
    val currency: String?,
    val lending_date: String,
    val expected_payback_date: String?,
    val notes: String?,
    val penaltyRate: Double?
)

data class EntryCollection(
    val collection_id: String,
    val entry_id: String,
    val user_id: String,
    val amount_collected: Double,
    val collection_date: String,
    val payment_method: String,
    val notes: String?,
    val transaction_id: String?,
    val proof_filename: String?,
    val proof_mime_type: String?,
    val is_archived: Boolean,
    val archive_reason: String?,
    val created_at: String,
    val updated_at: String
)

data class CollectionRequest(
    val amount_collected: Double,
    val collection_date: String,
    val payment_method: String?,
    val notes: String?,
    val transaction_id: String?
)
