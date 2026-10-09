package com.vikash_api.dtos.requests;

import jakarta.validation.constraints.*;

public record CategoryRequest(
    @NotBlank(message = "Informe o nome da categoria.")
    @Size(min = 2, max = 100, message = "O nome deve ter entre 2 e 100 caracteres.")
    String name,
    @NotBlank(message = "Escolha um ícone.")
    @Pattern(regexp = "paw|gift|suitcase|book|dumbbell|game|heart|car|bag|coffee|music|leaf|health|basket|house|food|ticket|plane|bus|train|bike|fuel|wallet|card|bank|briefcase|graduation|phone|laptop|wifi|lightbulb|water|tools|shirt|baby|beauty"
        + "|receipt|calendar|shield|chart|piggy|coins|stethoscope|pill|tooth|glasses|pizza|cake|cinema|camera|ball|beach|delivery|package|scissors|sofa|cleaning|building|dog|palette", message = "Escolha um ícone disponível no app.")
    String icon,
    @NotBlank(message = "Escolha uma cor.")
    @Pattern(regexp = "sage|terracotta|ochre|blue|lavender|gray|mint|emerald|olive|lime|peach|orange|coral|rose|red|purple|cyan|sand"
        + "|navy|royal|sky|teal|turquoise|forest|mustard|burgundy|fuchsia|plum|brown|slate", message = "Escolha uma cor disponível no app.")
    String color
) {
    public CategoryRequest {
        if (name != null) { name = name.trim(); }
    }
}
