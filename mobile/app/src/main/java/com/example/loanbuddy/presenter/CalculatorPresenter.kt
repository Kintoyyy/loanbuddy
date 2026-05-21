package com.example.loanbuddy.presenter

import kotlin.math.pow

class CalculatorPresenter {
    fun simpleInterest(principal: Double, rate: Double, years: Double): Pair<Double, Double> {
        val interest = (principal * rate * years) / 100
        return interest to (principal + interest)
    }

    fun compoundInterest(principal: Double, rate: Double, years: Double, compoundsPerYear: Double): Pair<Double, Double> {
        val amount = principal * (1 + rate / 100 / compoundsPerYear).pow(compoundsPerYear * years)
        return (amount - principal) to amount
    }

    fun emi(principal: Double, monthlyRatePercent: Double, months: Double): Triple<Double, Double, Double> {
        val monthlyRate = monthlyRatePercent / 100
        val emi = if (monthlyRate == 0.0) {
            principal / months
        } else {
            (principal * monthlyRate * (1 + monthlyRate).pow(months)) /
                ((1 + monthlyRate).pow(months) - 1)
        }
        val totalPayment = emi * months
        val totalInterest = totalPayment - principal
        return Triple(emi, totalInterest, totalPayment)
    }
}