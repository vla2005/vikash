-- Contrato financial-v1-2026-10-16. Aplicar após as tabelas do Hibernate.
-- Não executa propostas da IA e não concede acesso a tabelas base.
-- O executor aplica SET LOCAL do UUID autenticado, papel restrito e limites.
-- Aplicar também assistant-reader-permissions.sql para o acesso somente leitura.
BEGIN;
CREATE SCHEMA IF NOT EXISTS assistant_finance;
REVOKE ALL ON SCHEMA assistant_finance FROM PUBLIC;

CREATE OR REPLACE VIEW assistant_finance.accounts WITH (security_barrier = true) AS
SELECT a.uuid AS account_uuid, a.description::text AS account_name, a.type::text AS account_type,
       COALESCE(f.name, 'Carteira')::text AS institution_name, a.balance, a.active
FROM public.accounts a LEFT JOIN public.financial_institutions f ON f.id = a.financial_institution_id
WHERE a.user_id = (SELECT u.id FROM public.users u WHERE u.uuid = NULLIF(pg_catalog.current_setting('app.assistant_user_uuid', true), '')::uuid AND u.active);

CREATE OR REPLACE VIEW assistant_finance.cards WITH (security_barrier = true) AS
SELECT c.uuid AS card_uuid, f.name::text AS institution_name, c.last_four_digits, c.credit_limit, c.active
FROM public.credit_cards c JOIN public.financial_institutions f ON f.id = c.financial_institution_id
WHERE c.user_id = (SELECT u.id FROM public.users u WHERE u.uuid = NULLIF(pg_catalog.current_setting('app.assistant_user_uuid', true), '')::uuid AND u.active);

CREATE OR REPLACE VIEW assistant_finance.transactions WITH (security_barrier = true) AS
SELECT t.uuid AS transaction_uuid, a.uuid AS account_uuid, a.description::text AS account_name,
       COALESCE(f.name, 'Carteira')::text AS institution_name, COALESCE(cc.name, dc.name)::text AS category_name,
       t.description::text AS description, t.amount, t.type::text AS type, t.payment_method::text AS payment_method,
       t.occurred_at, t.type = 'EXPENSE' AS is_consumption, t.type IN ('EXPENSE', 'INVOICE_PAYMENT') AS is_cash_outflow
FROM public.transactions t JOIN public.accounts a ON a.id = t.account_id AND a.user_id = t.user_id
LEFT JOIN public.financial_institutions f ON f.id = a.financial_institution_id
LEFT JOIN public.custom_categories cc ON cc.id = t.custom_category_id AND cc.user_id = t.user_id
LEFT JOIN public.default_categories dc ON dc.id = t.default_category_id
WHERE t.user_id = (SELECT u.id FROM public.users u WHERE u.uuid = NULLIF(pg_catalog.current_setting('app.assistant_user_uuid', true), '')::uuid AND u.active);

CREATE OR REPLACE VIEW assistant_finance.purchases WITH (security_barrier = true) AS
SELECT p.uuid AS purchase_uuid, c.uuid AS card_uuid, f.name::text AS institution_name, c.last_four_digits,
       COALESCE(cc.name, dc.name)::text AS category_name, p.description::text AS description,
       p.amount, p.installment_count, p.occurred_at
FROM public.credit_card_purchases p JOIN public.credit_cards c ON c.id = p.credit_card_id
JOIN public.financial_institutions f ON f.id = c.financial_institution_id
LEFT JOIN public.custom_categories cc ON cc.id = p.custom_category_id AND cc.user_id = c.user_id
LEFT JOIN public.default_categories dc ON dc.id = p.default_category_id
WHERE c.user_id = (SELECT u.id FROM public.users u WHERE u.uuid = NULLIF(pg_catalog.current_setting('app.assistant_user_uuid', true), '')::uuid AND u.active);

CREATE OR REPLACE VIEW assistant_finance.installments WITH (security_barrier = true) AS
SELECT i.uuid AS installment_uuid, p.uuid AS purchase_uuid, inv.uuid AS invoice_uuid, c.uuid AS card_uuid,
       f.name::text AS institution_name, c.last_four_digits, COALESCE(cc.name, dc.name)::text AS category_name,
       p.description::text AS description, i.amount, i.installment_number, p.installment_count,
       p.occurred_at AS purchase_occurred_at, inv.reference_month::text AS reference_month, inv.due_date,
       inv.status::text AS invoice_status
FROM public.credit_card_installments i JOIN public.credit_card_purchases p ON p.id = i.purchase_id
JOIN public.credit_cards c ON c.id = p.credit_card_id
JOIN public.credit_card_invoices inv ON inv.id = i.credit_card_invoice_id AND inv.credit_card_id = c.id
JOIN public.financial_institutions f ON f.id = c.financial_institution_id
LEFT JOIN public.custom_categories cc ON cc.id = p.custom_category_id AND cc.user_id = c.user_id
LEFT JOIN public.default_categories dc ON dc.id = p.default_category_id
WHERE c.user_id = (SELECT u.id FROM public.users u WHERE u.uuid = NULLIF(pg_catalog.current_setting('app.assistant_user_uuid', true), '')::uuid AND u.active);

CREATE OR REPLACE VIEW assistant_finance.invoices WITH (security_barrier = true) AS
SELECT inv.uuid AS invoice_uuid, c.uuid AS card_uuid, f.name::text AS institution_name, c.last_four_digits,
       inv.reference_month::text AS reference_month, inv.closing_date, inv.due_date, inv.status::text AS status,
       inv.initial_amount, COALESCE(parts.total, 0) AS installments_amount,
       inv.initial_amount + COALESCE(parts.total, 0) AS total_amount
FROM public.credit_card_invoices inv JOIN public.credit_cards c ON c.id = inv.credit_card_id
JOIN public.financial_institutions f ON f.id = c.financial_institution_id
LEFT JOIN LATERAL (
    SELECT SUM(i.amount) AS total FROM public.credit_card_installments i
    JOIN public.credit_card_purchases p ON p.id = i.purchase_id AND p.credit_card_id = c.id
    WHERE i.credit_card_invoice_id = inv.id
) parts ON true
WHERE c.user_id = (SELECT u.id FROM public.users u WHERE u.uuid = NULLIF(pg_catalog.current_setting('app.assistant_user_uuid', true), '')::uuid AND u.active);

CREATE OR REPLACE VIEW assistant_finance.categories WITH (security_barrier = true) AS
SELECT 'default:' || d.id::text AS category_key, d.name::text AS category_name, false AS is_custom
FROM public.default_categories d
WHERE EXISTS (SELECT 1 FROM public.users u WHERE u.uuid = NULLIF(pg_catalog.current_setting('app.assistant_user_uuid', true), '')::uuid AND u.active)
UNION ALL
SELECT 'custom:' || c.uuid::text, c.name::text, true FROM public.custom_categories c
WHERE c.user_id = (SELECT u.id FROM public.users u WHERE u.uuid = NULLIF(pg_catalog.current_setting('app.assistant_user_uuid', true), '')::uuid AND u.active);
REVOKE ALL ON ALL TABLES IN SCHEMA assistant_finance FROM PUBLIC;
COMMIT;
