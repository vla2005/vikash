BEGIN;

CREATE OR REPLACE VIEW assistant_finance.monthly_account_cash_flow WITH (security_barrier = true) AS
SELECT t.account_uuid, t.account_name, t.institution_name,
       pg_catalog.date_trunc('month', t.occurred_at)::date AS month_start,
       COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'INCOME'), 0) AS income,
       COALESCE(SUM(t.amount) FILTER (WHERE t.is_cash_outflow), 0) AS cash_outflow,
       COALESCE(SUM(t.amount) FILTER (WHERE t.is_consumption), 0) AS consumption
FROM assistant_finance.transactions t
WHERE t.type <> 'TRANSFER'
GROUP BY t.account_uuid, t.account_name, t.institution_name, month_start;

CREATE OR REPLACE VIEW assistant_finance.debt_overview WITH (security_barrier = true) AS
SELECT p.debt_uuid, p.creditor, p.description,
       COUNT(*) AS installment_count,
       COUNT(*) FILTER (WHERE p.is_paid) AS paid_installments,
       COUNT(*) FILTER (WHERE NOT p.is_paid) AS pending_installments,
       SUM(p.amount) AS total_amount,
       COALESCE(SUM(p.amount) FILTER (WHERE p.is_paid), 0) AS paid_amount,
       COALESCE(SUM(p.amount) FILTER (WHERE NOT p.is_paid), 0) AS pending_amount,
       MIN(p.due_date) FILTER (WHERE NOT p.is_paid) AS next_due_date,
       MAX(p.amount) FILTER (WHERE NOT p.is_paid) AS max_pending_installment_amount
FROM assistant_finance.debt_installments p
GROUP BY p.debt_uuid, p.creditor, p.description;

ALTER VIEW assistant_finance.monthly_account_cash_flow OWNER TO vikash_assistant_view_owner;
ALTER VIEW assistant_finance.debt_overview OWNER TO vikash_assistant_view_owner;
REVOKE ALL ON assistant_finance.monthly_account_cash_flow, assistant_finance.debt_overview
    FROM PUBLIC, vikash_assistant_reader;
GRANT SELECT ON assistant_finance.monthly_account_cash_flow, assistant_finance.debt_overview
    TO vikash_assistant_reader;

COMMIT;
