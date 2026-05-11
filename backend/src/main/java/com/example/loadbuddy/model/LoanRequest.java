package com.example.loadbuddy.model;

import java.math.BigDecimal;

public class LoanRequest {

    private String borrowerName;
    private BigDecimal amount;
    private String description;
    private String dateLent;
    private String dueDate;
    private String status;

    public String getBorrowerName() { return borrowerName; }
    public void setBorrowerName(String borrowerName) { this.borrowerName = borrowerName; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getDateLent() { return dateLent; }
    public void setDateLent(String dateLent) { this.dateLent = dateLent; }

    public String getDueDate() { return dueDate; }
    public void setDueDate(String dueDate) { this.dueDate = dueDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
