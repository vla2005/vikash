BEGIN;
ALTER TABLE assistant_messages ADD COLUMN IF NOT EXISTS query_result_json VARCHAR(65536);
ALTER TABLE assistant_messages ADD COLUMN IF NOT EXISTS query_result_hash VARCHAR(64);
ALTER TABLE assistant_messages ADD COLUMN IF NOT EXISTS query_execution_version VARCHAR(64);
ALTER TABLE assistant_messages ADD COLUMN IF NOT EXISTS query_failure_reason VARCHAR(64);
ALTER TABLE assistant_messages ADD COLUMN IF NOT EXISTS query_owner_uuid UUID;
ALTER TABLE assistant_messages ADD COLUMN IF NOT EXISTS query_executed_at TIMESTAMP WITH TIME ZONE;
COMMIT;
