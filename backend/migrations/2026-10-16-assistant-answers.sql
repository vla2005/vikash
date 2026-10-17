BEGIN;
ALTER TABLE assistant_messages ADD COLUMN IF NOT EXISTS answer_version VARCHAR(64);
ALTER TABLE assistant_messages ADD COLUMN IF NOT EXISTS answer_input_hash VARCHAR(64);
ALTER TABLE assistant_messages ADD COLUMN IF NOT EXISTS answer_output_hash VARCHAR(64);
ALTER TABLE assistant_messages ADD COLUMN IF NOT EXISTS answer_failure_reason VARCHAR(64);
ALTER TABLE assistant_messages ADD COLUMN IF NOT EXISTS answered_at TIMESTAMP WITH TIME ZONE;
COMMIT;
