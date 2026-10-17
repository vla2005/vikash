BEGIN;
ALTER TABLE assistant_messages ADD COLUMN IF NOT EXISTS sql_validation_version VARCHAR(64);
ALTER TABLE assistant_messages ADD COLUMN IF NOT EXISTS validated_sql VARCHAR(24000);
ALTER TABLE assistant_messages ADD COLUMN IF NOT EXISTS sql_validation_hash VARCHAR(64);
ALTER TABLE assistant_messages ADD COLUMN IF NOT EXISTS sql_rejection_reason VARCHAR(64);
ALTER TABLE assistant_messages ADD COLUMN IF NOT EXISTS sql_validated_at TIMESTAMP WITH TIME ZONE;
COMMIT;
