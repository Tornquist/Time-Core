DROP INDEX entry_deleted on entry;
ALTER TABLE entry DROP COLUMN deleted;
ALTER TABLE entry DROP COLUMN deleted_at;
