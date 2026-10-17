-- Administrador/owner, após as views. Sem credenciais; NOLOGIN até senha provisionada.
BEGIN;
DO $setup$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='vikash_assistant_view_owner') THEN
        CREATE ROLE vikash_assistant_view_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='vikash_assistant_reader') THEN
        CREATE ROLE vikash_assistant_reader NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_auth_members WHERE member IN (SELECT oid FROM pg_roles WHERE rolname IN ('vikash_assistant_reader','vikash_assistant_view_owner')) OR roleid IN (SELECT oid FROM pg_roles WHERE rolname='vikash_assistant_view_owner')) THEN
        RAISE EXCEPTION 'Papéis do assistente não podem ter memberships';
    END IF;
END
$setup$;
ALTER ROLE vikash_assistant_view_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION;
ALTER ROLE vikash_assistant_reader NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION CONNECTION LIMIT 6;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM vikash_assistant_reader,vikash_assistant_view_owner;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM vikash_assistant_reader,vikash_assistant_view_owner;
REVOKE ALL ON SCHEMA public FROM vikash_assistant_reader,vikash_assistant_view_owner;
GRANT USAGE ON SCHEMA public TO vikash_assistant_view_owner;
GRANT SELECT(id,uuid,active) ON public.users TO vikash_assistant_view_owner;
GRANT SELECT(id,uuid,user_id,type,financial_institution_id,description,balance,active) ON public.accounts TO vikash_assistant_view_owner;
GRANT SELECT(id,uuid,user_id,financial_institution_id,last_four_digits,credit_limit,active) ON public.credit_cards TO vikash_assistant_view_owner;
GRANT SELECT(uuid,user_id,account_id,description,amount,type,payment_method,default_category_id,custom_category_id,occurred_at) ON public.transactions TO vikash_assistant_view_owner;
GRANT SELECT(id,uuid,credit_card_id,description,amount,installment_count,default_category_id,custom_category_id,occurred_at) ON public.credit_card_purchases TO vikash_assistant_view_owner;
GRANT SELECT(uuid,purchase_id,credit_card_invoice_id,installment_number,amount) ON public.credit_card_installments TO vikash_assistant_view_owner;
GRANT SELECT(id,uuid,credit_card_id,reference_month,initial_amount,closing_date,due_date,status) ON public.credit_card_invoices TO vikash_assistant_view_owner;
GRANT SELECT(id,name) ON public.financial_institutions TO vikash_assistant_view_owner;
GRANT SELECT(id,name) ON public.default_categories TO vikash_assistant_view_owner;
GRANT SELECT(id,uuid,user_id,name) ON public.custom_categories TO vikash_assistant_view_owner;
ALTER SCHEMA assistant_finance OWNER TO vikash_assistant_view_owner;
REVOKE ALL ON SCHEMA assistant_finance FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA assistant_finance FROM PUBLIC,vikash_assistant_reader;
ALTER VIEW assistant_finance.accounts OWNER TO vikash_assistant_view_owner;
ALTER VIEW assistant_finance.cards OWNER TO vikash_assistant_view_owner;
ALTER VIEW assistant_finance.transactions OWNER TO vikash_assistant_view_owner;
ALTER VIEW assistant_finance.purchases OWNER TO vikash_assistant_view_owner;
ALTER VIEW assistant_finance.installments OWNER TO vikash_assistant_view_owner;
ALTER VIEW assistant_finance.invoices OWNER TO vikash_assistant_view_owner;
ALTER VIEW assistant_finance.categories OWNER TO vikash_assistant_view_owner;
GRANT USAGE ON SCHEMA assistant_finance TO vikash_assistant_reader;
GRANT SELECT ON assistant_finance.accounts,assistant_finance.cards,assistant_finance.transactions,assistant_finance.purchases,assistant_finance.installments,assistant_finance.invoices,assistant_finance.categories TO vikash_assistant_reader;
DO $defaults$
DECLARE setting_name text; setting_value text;
BEGIN
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO vikash_assistant_reader',current_database());
    FOR setting_name,setting_value IN SELECT * FROM (VALUES
        ('default_transaction_read_only','on'),('search_path','pg_catalog'),('statement_timeout','2000ms'),
        ('lock_timeout','250ms'),('transaction_timeout','5000ms'),('idle_in_transaction_session_timeout','3000ms'),
        ('temp_file_limit','16MB'),('work_mem','2MB'),('max_parallel_workers_per_gather','0'),('jit','off'),
        ('log_min_messages','fatal'),('log_min_error_statement','panic'),('log_parameter_max_length','0'),('log_parameter_max_length_on_error','0')
    ) AS defaults(name,value) LOOP
        EXECUTE format('ALTER ROLE vikash_assistant_reader IN DATABASE %I SET %I=%L',current_database(),setting_name,setting_value);
    END LOOP;
END
$defaults$;
COMMIT;
