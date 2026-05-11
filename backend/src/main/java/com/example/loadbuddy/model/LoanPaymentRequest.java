package com.example.loadbuddy.model;

import java.math.BigDecimal;

public class LoanPaymentRequest {

    private BigDecimal amount;
    private String note;
    private String paymentDate;

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public String getPaymentDate() { return paymentDate; }
    public void setPaymentDate(String paymentDate) { this.paymentDate = paymentDate; }
}
