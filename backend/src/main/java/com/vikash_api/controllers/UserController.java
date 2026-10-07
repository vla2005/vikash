package com.vikash_api.controllers;

import org.apache.catalina.connector.Response;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.vikash_api.dtos.requests.UpdatePasswordRequest;
import com.vikash_api.dtos.requests.UserRequest;
import com.vikash_api.dtos.responses.UserResponse;
import com.vikash_api.services.UserService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping ("/api/user")
@RequiredArgsConstructor 
public class UserController {

    private final UserService userService;

    @PutMapping("/update")
    public ResponseEntity<UserResponse> update(@RequestBody @Valid UserRequest request){
        return ResponseEntity.ok(userService.update(request));
    }

    @PatchMapping("/update-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updatePassword(@RequestBody @Valid UpdatePasswordRequest request){
        userService.updatePassword(request);
    }
}
