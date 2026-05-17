package com.example.loanbuddy

import android.app.DatePickerDialog
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.loanbuddy.api.RetrofitClient
import com.example.loanbuddy.data.UpdatePasswordRequest
import com.example.loanbuddy.data.UpdateProfileRequest
import com.example.loanbuddy.databinding.ActivityProfileBinding
import com.example.loanbuddy.databinding.DialogChangePasswordBinding
import com.example.loanbuddy.databinding.DialogEditProfileBinding
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.Calendar

class ProfileActivity : AppCompatActivity() {

    private lateinit var binding: ActivityProfileBinding

    private val pickPhoto = registerForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) uploadPhoto(uri)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityProfileBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.backButton.setOnClickListener { finish() }
        BottomNavHelper.setup(this, BottomNavHelper.NAV_PROFILE)
        binding.btnChangePhoto.setOnClickListener { pickPhoto.launch("image/*") }
        binding.btnEditProfile.setOnClickListener { showEditProfileDialog() }
        binding.btnChangePassword.setOnClickListener { showChangePasswordDialog() }

        loadProfile()
    }

    private fun loadProfile() {
        val token = AuthManager.getBearerToken(this)
        binding.progressBar.visibility = View.VISIBLE

        lifecycleScope.launch {
            try {
                val profile = RetrofitClient.apiService.getProfile(token)

                val firstName = profile.first_name.orEmpty()
                val lastName = profile.last_name.orEmpty()
                val fullName = "$firstName $lastName".trim().ifBlank { profile.username ?: profile.email ?: "—" }

                binding.profileName.text = fullName
                binding.profileEmail.text = profile.email ?: "—"
                binding.profileUsername.text = profile.username?.let { "@$it" } ?: ""
                binding.valFirstName.text = firstName.ifBlank { "—" }
                binding.valLastName.text = lastName.ifBlank { "—" }
                binding.valUsername.text = profile.username ?: "—"
                binding.valBirthday.text = profile.birthday ?: "—"
                binding.valPhone.text = profile.phone.orEmpty().ifBlank { "—" }
                binding.valBio.text = profile.bio.orEmpty().ifBlank { "—" }

                val initials = buildInitials(firstName, lastName)
                binding.avatarInitials.text = initials

                AuthManager.saveProfile(this@ProfileActivity, firstName, lastName, profile.username)

                if (profile.photo_filename != null) loadPhoto(token)

            } catch (e: Exception) {
                Toast.makeText(this@ProfileActivity, "Failed to load profile: ${e.message}", Toast.LENGTH_SHORT).show()
            } finally {
                binding.progressBar.visibility = View.GONE
            }
        }
    }

    private fun loadPhoto(token: String) {
        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.getPhoto(token)
                if (response.isSuccessful) {
                    val bytes = response.body()?.bytes() ?: return@launch
                    val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return@launch
                    binding.avatarImage.setImageBitmap(bitmap)
                    binding.avatarImage.visibility = View.VISIBLE
                    binding.avatarInitials.visibility = View.GONE
                }
            } catch (_: Exception) { }
        }
    }

    private fun showEditProfileDialog() {
        val dBinding = DialogEditProfileBinding.inflate(layoutInflater)

        dBinding.inputFirstName.setText(binding.valFirstName.text.toString().let { if (it == "—") "" else it })
        dBinding.inputLastName.setText(binding.valLastName.text.toString().let { if (it == "—") "" else it })
        dBinding.inputUsername.setText(binding.valUsername.text.toString().let { if (it == "—") "" else it })
        dBinding.inputBirthday.setText(binding.valBirthday.text.toString().let { if (it == "—") "" else it })
        dBinding.inputPhone.setText(binding.valPhone.text.toString().let { if (it == "—") "" else it })
        dBinding.inputBio.setText(binding.valBio.text.toString().let { if (it == "—") "" else it })

        dBinding.inputBirthday.setOnClickListener {
            val cal = Calendar.getInstance()
            DatePickerDialog(this, { _, y, m, d ->
                dBinding.inputBirthday.setText("%04d-%02d-%02d".format(y, m + 1, d))
            }, cal.get(Calendar.YEAR) - 25, cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH)).show()
        }

        AlertDialog.Builder(this)
            .setTitle("Edit Profile")
            .setView(dBinding.root)
            .setPositiveButton("Save") { _, _ ->
                val firstName = dBinding.inputFirstName.text.toString().trim()
                val lastName = dBinding.inputLastName.text.toString().trim()
                val username = dBinding.inputUsername.text.toString().trim()
                if (firstName.isBlank() || lastName.isBlank() || username.isBlank()) {
                    Toast.makeText(this, "First name, last name and username are required", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                saveProfile(
                    firstName, lastName, username,
                    dBinding.inputBirthday.text.toString().trim(),
                    dBinding.inputPhone.text.toString().trim(),
                    dBinding.inputBio.text.toString().trim()
                )
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun saveProfile(firstName: String, lastName: String, username: String, birthday: String, phone: String, bio: String) {
        val token = AuthManager.getBearerToken(this)
        binding.progressBar.visibility = View.VISIBLE

        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.updateProfile(
                    token,
                    UpdateProfileRequest(firstName, lastName, username, birthday, phone, bio)
                )
                AuthManager.saveProfile(this@ProfileActivity, firstName, lastName, username)
                Toast.makeText(this@ProfileActivity, response.message ?: "Profile updated", Toast.LENGTH_SHORT).show()
                loadProfile()
            } catch (e: Exception) {
                binding.progressBar.visibility = View.GONE
                Toast.makeText(this@ProfileActivity, "Failed to update: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun showChangePasswordDialog() {
        val dBinding = DialogChangePasswordBinding.inflate(layoutInflater)

        AlertDialog.Builder(this)
            .setTitle("Change Password")
            .setView(dBinding.root)
            .setPositiveButton("Update") { _, _ ->
                val current = dBinding.inputCurrentPassword.text.toString()
                val newPass = dBinding.inputNewPassword.text.toString()
                val confirm = dBinding.inputConfirmPassword.text.toString()
                if (current.isBlank() || newPass.isBlank() || confirm.isBlank()) {
                    Toast.makeText(this, "All fields are required", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                if (newPass != confirm) {
                    Toast.makeText(this, "Passwords do not match", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                changePassword(current, newPass, confirm)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun changePassword(current: String, newPass: String, confirm: String) {
        val token = AuthManager.getBearerToken(this)
        binding.progressBar.visibility = View.VISIBLE

        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.updatePassword(
                    token,
                    UpdatePasswordRequest(current, newPass, confirm)
                )
                binding.progressBar.visibility = View.GONE
                Toast.makeText(this@ProfileActivity, response.message ?: "Password updated", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                binding.progressBar.visibility = View.GONE
                Toast.makeText(this@ProfileActivity, "Failed: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun uploadPhoto(uri: Uri) {
        val token = AuthManager.getBearerToken(this)
        val bytes = contentResolver.openInputStream(uri)?.readBytes() ?: return
        val mimeType = contentResolver.getType(uri) ?: "image/jpeg"
        val requestBody = bytes.toRequestBody(mimeType.toMediaTypeOrNull())
        val part = MultipartBody.Part.createFormData("file", "photo.jpg", requestBody)

        binding.progressBar.visibility = View.VISIBLE

        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.uploadPhoto(token, part)
                if (response.isSuccessful) {
                    Toast.makeText(this@ProfileActivity, "Photo updated", Toast.LENGTH_SHORT).show()
                    loadPhoto(token)
                } else {
                    Toast.makeText(this@ProfileActivity, "Upload failed (${response.code()})", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@ProfileActivity, "Upload error: ${e.message}", Toast.LENGTH_SHORT).show()
            } finally {
                binding.progressBar.visibility = View.GONE
            }
        }
    }

    private fun buildInitials(first: String, last: String): String {
        val f = first.firstOrNull()?.uppercaseChar()?.toString() ?: ""
        val l = last.firstOrNull()?.uppercaseChar()?.toString() ?: ""
        return "$f$l".ifBlank { "?" }
    }
}
