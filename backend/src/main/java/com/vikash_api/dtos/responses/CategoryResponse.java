package com.vikash_api.dtos.responses;

import java.util.UUID;

public record CategoryResponse(
    UUID uuid,
    String name,
    String icon,
    String color
) {

}
