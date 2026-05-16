package com.example.loadbuddy.model;

import java.math.BigDecimal;

public class PenaltyRequest {
    private BigDecimal amount;
    private String reason;
    private String penaltyDate;

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getPenaltyDate() { return penaltyDate; }
    public void setPenaltyDate(String penaltyDate) { this.penaltyDate = penaltyDate; }
}
