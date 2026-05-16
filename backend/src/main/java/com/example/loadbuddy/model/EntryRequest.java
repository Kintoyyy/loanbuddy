package com.example.loadbuddy.model;

import java.math.BigDecimal;

public class EntryRequest {

    private String debtor_id;
    private BigDecimal original_amount;
    private String currency;
    private String lending_date;
    private String expected_payback_date;
    private String notes;

    public String getDebtor_id() {
        return debtor_id;
    }

    public void setDebtor_id(String debtor_id) {
        this.debtor_id = debtor_id;
    }

    public BigDecimal getOriginal_amount() {
        return original_amount;
    }

    public void setOriginal_amount(BigDecimal original_amount) {
        this.original_amount = original_amount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getLending_date() {
        return lending_date;
    }

    public void setLending_date(String lending_date) {
        this.lending_date = lending_date;
    }

    public String getExpected_payback_date() {
        return expected_payback_date;
    }

    public void setExpected_payback_date(String expected_payback_date) {
        this.expected_payback_date = expected_payback_date;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
