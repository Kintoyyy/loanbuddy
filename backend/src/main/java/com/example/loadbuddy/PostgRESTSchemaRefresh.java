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
        final int maxAttempts = 5;

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                jdbcTemplate.execute("SELECT pg_notify('pgrst', 'reload schema')");
                System.out.println("[PostgREST] Schema cache reload notification sent.");
                return;
            } catch (Exception e) {
                if (attempt == maxAttempts) {
                    System.err.println("[PostgREST] Could not send schema reload notification after " + maxAttempts + " attempts: " + e.getMessage());
                    return;
                }

                try {
                    Thread.sleep(1000L * attempt);
                } catch (InterruptedException interruptedException) {
                    Thread.currentThread().interrupt();
                    System.err.println("[PostgREST] Schema cache reload interrupted while waiting to retry.");
                    return;
                }
            }
        }
    }
}
