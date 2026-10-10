-- Execute com a API parada antes de iniciar a versão que usa lastFourDigits.
BEGIN;

ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS last_four_digits INTEGER;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'credit_cards' AND column_name = 'description') THEN
        ALTER TABLE credit_cards RENAME COLUMN description TO legacy_description;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'credit_cards' AND column_name = 'legacy_description') THEN
        ALTER TABLE credit_cards ALTER COLUMN legacy_description DROP NOT NULL;
        -- Aproveita apenas descrições que já identificavam claramente o final.
        UPDATE credit_cards
        SET last_four_digits = substring(trim(legacy_description) FROM '[0-9]{4}$')::INTEGER
        WHERE last_four_digits IS NULL
          AND trim(legacy_description) ~* '^(cart[aã]o final[[:space:]]+)?[0-9]{4}$';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_credit_card_last_four_digits' AND conrelid = 'credit_cards'::regclass) THEN
        ALTER TABLE credit_cards ADD CONSTRAINT ck_credit_card_last_four_digits
            CHECK (last_four_digits BETWEEN 0 AND 9999);
    END IF;
END $$;

-- Nomes sem final ficam preservados em legacy_description, com last_four_digits nulo.
-- O usuário informa o final ao editar o cartão. Nenhum saldo, limite ou fatura é alterado.
COMMIT;
