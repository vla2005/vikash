package com.vikash_api.enums;

import java.util.Arrays;
import java.util.List;

/** Campos que precisam de informação ou correção na transcrição. */
public enum VoiceAnalysisField {
    DESCRIPTION("description", "Descreva o lançamento."),
    AMOUNT("amount", "Informe um valor válido para o lançamento."),
    TYPE("type", "Informe se foi uma entrada, saída, transferência entre suas contas ou pagamento de fatura."),
    PAYMENT_METHOD("paymentMethod", "Informe a forma de pagamento: Pix, débito, crédito, dinheiro, boleto ou transferência bancária."),
    ACCOUNT("accountUuid", "Informe a conta ou banco utilizado. Se houver mais de uma conta no banco, diga qual delas."),
    CREDIT_CARD("creditCardUuid", "Informe o cartão utilizado: banco ou os quatro dígitos finais."),
    DESTINATION_ACCOUNT("destinationAccountUuid", "Informe a conta ou banco de destino da transferência."),
    CREDIT_CARD_INVOICE("creditCardInvoiceUuid", "Informe o cartão e o mês/ano da fatura sem ambiguidades."),
    OCCURRED_AT("occurredAt", "Informe uma data e hora válidas para o lançamento."),
    INSTALLMENT_COUNT("installmentCount", "Informe a quantidade de parcelas da compra, entre 1 e 120."),
    MULTIPLE_TRANSACTIONS("multipleTransactions", "Fale apenas um lançamento por vez."),
    PARTIAL_INVOICE_PAYMENT("partialInvoicePayment", "Pagamentos parciais de faturas ainda não são suportados.");

    private final String field;
    private final String guidance;
    VoiceAnalysisField(String field, String guidance) { this.field = field; this.guidance = guidance; }
    public String field() { return field; }
    public String guidance() { return guidance; }
    public static List<String> fieldNames() { return Arrays.stream(values()).map(VoiceAnalysisField::field).toList(); }
    public static VoiceAnalysisField fromField(String field) {
        return Arrays.stream(values()).filter(value -> value.field.equals(field)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Campo de análise desconhecido."));
    }
}
