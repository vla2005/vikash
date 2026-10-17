BEGIN;
ALTER TABLE assistant_messages ADD COLUMN IF NOT EXISTS catalog_version VARCHAR(64);
ALTER TABLE assistant_messages ADD COLUMN IF NOT EXISTS proposal_json VARCHAR(24000);
ALTER TABLE assistant_messages ADD COLUMN IF NOT EXISTS reply_uuid UUID;
ALTER TABLE assistant_messages ADD COLUMN IF NOT EXISTS planning_token UUID;
ALTER TABLE assistant_messages ADD COLUMN IF NOT EXISTS planning_started_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS idx_assistant_message_history ON assistant_messages(conversation_id,id);
COMMIT;
