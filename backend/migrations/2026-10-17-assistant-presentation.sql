-- Metadados visuais validados, vinculados ao hash da resposta e ao mesmo usuário/conversa.
ALTER TABLE assistant_messages ADD COLUMN IF NOT EXISTS presentation_json varchar(48000);
