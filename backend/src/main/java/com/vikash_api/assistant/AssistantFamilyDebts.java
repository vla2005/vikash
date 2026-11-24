package com.vikash_api.assistant;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component @RequiredArgsConstructor
public class AssistantFamilyDebts {
    private static final Pattern LIST = Pattern.compile(
            "(?:(?:quais|que) (?:sao as |sao minhas |as )?|(?:liste|mostre|me mostre|me diga) (?:as |minhas )?)?"
            + "dividas (?:(?:ativas|em aberto) )?(?:(?:eu )?tenho )?(?:(?:ativas|em aberto) )?"
            + "com (?:os meus |meus |minha )?(?:parentes|familiares|familia)");
    private static final Pattern CORRECTION = Pattern.compile(
            "(?:(?:por que|porque|pq) )?(?:(?:voce|vc|o vikash) )?nao "
            + "(?:considerou|incluiu|listou|mostrou|colocou|contou) (?:a |o )?(?:minha|meu) "
            + "(?:prima|primo|pai|mae|tia|tio|irma|irmao|avo|vo|filha|filho|sobrinha|sobrinho)"
            + "(?: como (?:um |uma )?parente| na (?:lista|resposta))?(?: e inclu(?:a|ir) na resposta)?");
    private static final String SQL = """
            SELECT creditor, SUM(amount) AS saldo_em_aberto
            FROM assistant_finance.debt_installments
            WHERE is_family_debt = true AND is_paid = false
            GROUP BY debt_uuid, creditor
            ORDER BY saldo_em_aberto DESC, creditor, debt_uuid
            """;

    private final FinancialCatalog catalog;
    private final AssistantAnswerFormatter formatter;
    private final ObjectMapper mapper;

    public FinancialPlan planFor(String question, List<FinancialPlan.Turn> history) {
        String text = normalize(question);
        if (!LIST.matcher(text).matches() && !(CORRECTION.matcher(text).matches() && followsFamilyList(history))) return null;
        return new FinancialPlan(catalog.version(), FinancialPlan.Decision.query,
                "Dívidas em aberto com parentes indicados no credor ou na descrição", SQL,
                List.of(), List.of(FinancialPlan.DEBT_VIEW), null);
    }

    public AssistantAnswerFormatter.Answer answer(FinancialAnswerInput input) {
        var evidence = formatter.prepare(input);
        boolean found = evidence.rowCount() > 0;
        String template = found
                ? "Estas são as dívidas em aberto com parentes identificados no cadastro. O maior saldo da lista é com {{r0c0:text}}, de {{r0c1:money}}."
                : "Nenhuma dívida em aberto tem indicação de parentesco no nome do credor ou na descrição.";
        var blocks = found ? List.of(Map.of("type", "list", "title", "Dívidas com parentes", "caption", "Saldos em aberto",
                "labelColumn", "creditor", "valueColumn", "saldo_em_aberto", "format", "money")) : List.of();
        return formatter.parse(mapper.writeValueAsString(Map.of("template", template, "blocks", blocks)), evidence);
    }

    private static boolean followsFamilyList(List<FinancialPlan.Turn> history) {
        for (var turn : history.reversed()) {
            if (!"user".equals(turn.role())) continue;
            String text = normalize(turn.content());
            if (LIST.matcher(text).matches()) return true;
            if (!CORRECTION.matcher(text).matches()) return false;
        }
        return false;
    }

    private static String normalize(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT).strip().replaceFirst("[?!.]+$", "").strip().replaceAll("\\s+", " ");
    }
}
