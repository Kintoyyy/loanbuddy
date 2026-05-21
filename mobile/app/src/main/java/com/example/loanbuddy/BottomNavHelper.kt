package com.example.loanbuddy

import android.content.Intent
import android.view.View
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.example.loanbuddy.view.CalculatorActivity
import com.example.loanbuddy.view.DebtorsActivity
import com.example.loanbuddy.view.HomeActivity
import com.example.loanbuddy.view.LoansActivity
import com.example.loanbuddy.view.ProfileActivity
import com.example.loanbuddy.view.SettingsActivity

object BottomNavHelper {

    const val NAV_HOME = 0
    const val NAV_LOANS = 1
    const val NAV_DEBTORS = 2
    const val NAV_ENTRIES = 3
    const val NAV_CALC = 4
    const val NAV_PROFILE = 5
    const val NAV_SETTINGS = 6

    private val navItemIds = intArrayOf(
        R.id.nav_home, R.id.nav_loans, R.id.nav_debtors,
        R.id.nav_entries, R.id.nav_calc, R.id.nav_profile, R.id.nav_settings
    )
    private val bgIds = intArrayOf(
        R.id.nav_bg_home, R.id.nav_bg_loans, R.id.nav_bg_debtors,
        R.id.nav_bg_entries, R.id.nav_bg_calc, R.id.nav_bg_profile, R.id.nav_bg_settings
    )
    private val iconIds = intArrayOf(
        R.id.nav_icon_home, R.id.nav_icon_loans, R.id.nav_icon_debtors,
        R.id.nav_icon_entries, R.id.nav_icon_calc, R.id.nav_icon_profile, R.id.nav_icon_settings
    )
    private val labelIds = intArrayOf(
        R.id.nav_label_home, R.id.nav_label_loans, R.id.nav_label_debtors,
        R.id.nav_label_entries, R.id.nav_label_calc, R.id.nav_label_profile, R.id.nav_label_settings
    )
    private val destinations = arrayOf<Class<*>>(
        HomeActivity::class.java, LoansActivity::class.java, DebtorsActivity::class.java,
        EntriesActivity::class.java, CalculatorActivity::class.java,
        ProfileActivity::class.java, SettingsActivity::class.java
    )

    fun setup(activity: AppCompatActivity, activeIndex: Int) {
        val root = activity.window.decorView

        for (i in navItemIds.indices) {
            val item = root.findViewById<View>(navItemIds[i]) ?: continue
            val bg = root.findViewById<View>(bgIds[i])
            val icon = root.findViewById<ImageView>(iconIds[i])
            val label = root.findViewById<TextView>(labelIds[i])

            val isActive = i == activeIndex
            if (isActive) {
                bg?.setBackgroundResource(R.drawable.bg_nav_active)
                icon?.setColorFilter(ContextCompat.getColor(activity, R.color.white))
                label?.setTextColor(ContextCompat.getColor(activity, R.color.zinc_900))
            } else {
                bg?.background = null
                icon?.setColorFilter(ContextCompat.getColor(activity, R.color.zinc_400))
                label?.setTextColor(ContextCompat.getColor(activity, R.color.zinc_400))

                item.setOnClickListener {
                    val intent = Intent(activity, destinations[i])
                    intent.flags = Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                    activity.startActivity(intent)
                }
            }
        }
    }
}
