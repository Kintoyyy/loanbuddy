package com.example.loadbuddy.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.DataAccessException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(ResponseStatusException.class)
        public ResponseEntity<Map<String, Object>> handleResponseStatusException(
            ResponseStatusException exception,
            HttpServletRequest request
        ) {
        HttpStatus status = HttpStatus.valueOf(exception.getStatusCode().value());
        LOGGER.error("Request failed with status {} and message {}", status.value(), exception.getReason(), exception);
        String detail = exception.getMostSpecificCause() != null
            ? exception.getMostSpecificCause().getMessage()
            : exception.getReason();
        return ResponseEntity.status(status)
            .body(buildErrorBody(status, exception.getReason(), detail, exception.getClass().getSimpleName(), request));
    }

    @ExceptionHandler(DataAccessException.class)
        public ResponseEntity<Map<String, Object>> handleDataAccessException(
            DataAccessException exception,
            HttpServletRequest request
        ) {
        String detail = exception.getMostSpecificCause() != null
                ? exception.getMostSpecificCause().getMessage()
                : exception.getMessage();
        LOGGER.error("Database operation failed: {}", detail, exception);
        HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;
        return ResponseEntity.status(status)
            .body(buildErrorBody(
                status,
                "Database operation failed. Verify connection and migrations.",
                detail,
                exception.getClass().getSimpleName(),
                request
            ));
    }

    @ExceptionHandler(Exception.class)
        public ResponseEntity<Map<String, Object>> handleUnexpectedException(
            Exception exception,
            HttpServletRequest request
        ) {
        LOGGER.error("Unexpected server error", exception);
            String detail = exception.getCause() != null
                ? exception.getCause().getMessage()
                : exception.getMessage();
        HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;
        return ResponseEntity.status(status)
            .body(buildErrorBody(status, "Unexpected server error", detail, exception.getClass().getSimpleName(), request));
        }

        private Map<String, Object> buildErrorBody(
            HttpStatus status,
            String message,
            String detail,
            String exceptionType,
            HttpServletRequest request
        ) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        body.put("detail", detail);
        body.put("exception", exceptionType);
        body.put("path", request.getRequestURI());
        body.put("method", request.getMethod());
        return body;
    }
}
