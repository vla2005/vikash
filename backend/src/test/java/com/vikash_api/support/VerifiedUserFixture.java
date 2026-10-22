package com.vikash_api.support;

import com.vikash_api.dtos.requests.RegisterRequest;
import com.vikash_api.dtos.responses.AuthResponse;
import com.vikash_api.services.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.Map;

/** Trusted fixture creation for tests unrelated to signup. Never included in production. */
public abstract class VerifiedUserFixture {
    @Autowired private AuthService fixtureAuth;
    @Autowired private PasswordEncoder fixtureEncoder;
    protected AuthResponse createTestUser(RegisterRequest request) {
        return fixtureAuth.createVerifiedAccount(request.getName(), request.getEmail(), fixtureEncoder.encode(request.getPassword()));
    }
    protected AuthResponse createTestUser(Map<String, String> values) {
        return createTestUser(new RegisterRequest(values.get("name"), values.get("email"), values.get("password")));
    }
}
