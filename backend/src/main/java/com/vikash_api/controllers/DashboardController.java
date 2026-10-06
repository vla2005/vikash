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

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping ("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    public ResponseEntity<DashboardResponse> getDashboard(@RequestParam @Min(1) @Max(12) int month, @RequestParam int year){
        return ResponseEntity.ok(dashboardService.getDashboard(month, year));
    }
}
