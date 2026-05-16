package com.example.loadbuddy;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class PostgRESTSchemaRefresh {

    private final JdbcTemplate jdbcTemplate;

    public PostgRESTSchemaRefresh(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void refreshSchemaCache() {
        try {
            jdbcTemplate.execute("SELECT pg_notify('pgrst', 'reload schema')");
            System.out.println("[PostgREST] Schema cache reload notification sent.");
        } catch (Exception e) {
            System.err.println("[PostgREST] Could not send schema reload notification: " + e.getMessage());
        }
    }
}
