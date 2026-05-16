package com.example.loadbuddy.model;

public class DebtorRequest {

    private String debtor_name;
    private String debtor_type;
    private String phone_number;
    private String email;

    public String getDebtor_name() {
        return debtor_name;
    }

    public void setDebtor_name(String debtor_name) {
        this.debtor_name = debtor_name;
    }

    public String getDebtor_type() {
        return debtor_type;
    }

    public void setDebtor_type(String debtor_type) {
        this.debtor_type = debtor_type;
    }

    public String getPhone_number() {
        return phone_number;
    }

    public void setPhone_number(String phone_number) {
        this.phone_number = phone_number;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
