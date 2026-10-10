package com.vikash_api.controllers;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.vikash_api.dtos.responses.DashboardResponse;
import com.vikash_api.services.DashboardService;
import com.vikash_api.services.CreditDashboardService;
import com.vikash_api.dtos.responses.CreditDashboardResponse;
import java.util.UUID;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping ("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final CreditDashboardService creditDashboardService;

    @GetMapping("/credit")
    public ResponseEntity<CreditDashboardResponse> getCreditDashboard(
            @RequestParam @Min(1) @Max(12) int month,
            @RequestParam @Min(1900) @Max(9999) int year,
            @RequestParam(required = false) UUID creditCardUuid) {
        return ResponseEntity.ok(creditDashboardService.get(month, year, creditCardUuid));
    }

    @GetMapping
    public ResponseEntity<DashboardResponse> getDashboard(@RequestParam @Min(1) @Max(12) int month, @RequestParam int year){
        return ResponseEntity.ok(dashboardService.getDashboard(month, year));
    }
}
