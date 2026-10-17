BEGIN;
ALTER TABLE assistant_conversations ADD COLUMN IF NOT EXISTS memory_json VARCHAR(12000);
ALTER TABLE assistant_conversations ADD COLUMN IF NOT EXISTS memory_hash VARCHAR(64);
ALTER TABLE assistant_conversations ADD COLUMN IF NOT EXISTS memory_updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE assistant_messages ADD COLUMN IF NOT EXISTS memory_context_json VARCHAR(12000);
ALTER TABLE assistant_messages ADD COLUMN IF NOT EXISTS memory_context_hash VARCHAR(64);
COMMIT;
