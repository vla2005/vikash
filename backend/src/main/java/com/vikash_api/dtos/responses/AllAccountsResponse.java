package com.vikash_api.dtos.responses;

import java.util.List;

public record AllAccountsResponse(
    List<AccountResponse> accounts
) {

}
