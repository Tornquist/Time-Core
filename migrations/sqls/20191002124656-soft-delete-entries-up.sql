ALTER TABLE entry ADD COLUMN deleted_at timestamp NULL DEFAULT NULL AFTER updated_at;
ALTER TABLE entry ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT FALSE AFTER ended_at_timezone_id;
CREATE INDEX entry_deleted ON entry(deleted);
