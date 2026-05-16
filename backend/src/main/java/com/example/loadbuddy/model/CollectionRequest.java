package com.example.loadbuddy.model;

import java.math.BigDecimal;

public class CollectionRequest {

    private BigDecimal amount_collected;
    private String collection_date;
    private String payment_method;
    private String notes;
    private String transaction_id;

    public BigDecimal getAmount_collected() {
        return amount_collected;
    }

    public void setAmount_collected(BigDecimal amount_collected) {
        this.amount_collected = amount_collected;
    }

    public String getCollection_date() {
        return collection_date;
    }

    public void setCollection_date(String collection_date) {
        this.collection_date = collection_date;
    }

    public String getPayment_method() {
        return payment_method;
    }

    public void setPayment_method(String payment_method) {
        this.payment_method = payment_method;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getTransaction_id() {
        return transaction_id;
    }

    public void setTransaction_id(String transaction_id) {
        this.transaction_id = transaction_id;
    }
}
