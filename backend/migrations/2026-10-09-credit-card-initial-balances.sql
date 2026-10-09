BEGIN;

ALTER TABLE credit_cards
    ADD COLUMN IF NOT EXISTS unallocated_used_limit NUMERIC(15, 2) NOT NULL DEFAULT 0;

ALTER TABLE credit_card_invoices
    ADD COLUMN IF NOT EXISTS initial_amount NUMERIC(15, 2) NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_credit_card_unallocated_used_limit'
          AND conrelid = 'credit_cards'::regclass) THEN
        ALTER TABLE credit_cards ADD CONSTRAINT ck_credit_card_unallocated_used_limit
            CHECK (unallocated_used_limit >= 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_credit_card_invoice_initial_amount'
          AND conrelid = 'credit_card_invoices'::regclass) THEN
        ALTER TABLE credit_card_invoices ADD CONSTRAINT ck_credit_card_invoice_initial_amount
            CHECK (initial_amount >= 0);
    END IF;
END $$;

COMMIT;
