-- Aplicar após as tabelas de dívidas e o provisionamento do leitor do assistente.
BEGIN;

GRANT SELECT(id,uuid,user_id,creditor,description,total_amount,installment_count,
             initially_paid_installments,initial_next_due_date,paid_installments)
    ON public.debts TO vikash_assistant_view_owner;
GRANT SELECT(debt_id,debt_installment_number) ON public.transactions TO vikash_assistant_view_owner;

CREATE OR REPLACE VIEW assistant_finance.debt_installments WITH (security_barrier = true) AS
SELECT d.uuid AS debt_uuid, d.creditor::text AS creditor, d.description::text AS description,
       part.index + 1 AS installment_number, d.installment_count,
       -- Mesmo rateio do DebtService: distribui os centavos restantes nas primeiras parcelas.
       ((cents.total / d.installment_count + CASE WHEN part.index < cents.total % d.installment_count
           THEN 1 ELSE 0 END) * 0.01)::numeric(12,2) AS amount,
       CASE WHEN part.index >= d.paid_installments THEN
           (d.initial_next_due_date + (part.index - d.initially_paid_installments) * INTERVAL '1 month')::date
       END AS due_date,
       part.index < d.paid_installments AS is_paid,
       payment.occurred_at AS paid_at,
       pg_catalog.translate(
           pg_catalog.lower(d.creditor || ' ' || COALESCE(d.description, '')),
           'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'
       ) ~ '\m(pai|pais|papai|maes?|mamae|irmaos?|irmas?|ti[oa]s?|prim[oa]s?|avos?|bisavos?|vo|vovos?|filh[oa]s?|net[oa]s?|sobrinh[oa]s?|sogr[oa]s?|cunhad[oa]s?|padrastros?|madrastas?|entead[oa]s?|espos[oa]s?|parentes?|familia)\M'
           AS is_family_debt
FROM public.debts d
CROSS JOIN LATERAL (SELECT (d.total_amount * 100)::bigint AS total) cents
CROSS JOIN LATERAL pg_catalog.generate_series(0,d.installment_count - 1) AS part(index)
LEFT JOIN public.transactions payment ON payment.debt_id = d.id AND payment.user_id = d.user_id
    AND payment.debt_installment_number = part.index + 1 AND part.index < d.paid_installments
WHERE d.user_id = (SELECT u.id FROM public.users u WHERE u.uuid = NULLIF(pg_catalog.current_setting('app.assistant_user_uuid', true), '')::uuid AND u.active);

ALTER VIEW assistant_finance.debt_installments OWNER TO vikash_assistant_view_owner;
REVOKE ALL ON assistant_finance.debt_installments FROM PUBLIC;
GRANT SELECT ON assistant_finance.debt_installments TO vikash_assistant_reader;

COMMIT;
