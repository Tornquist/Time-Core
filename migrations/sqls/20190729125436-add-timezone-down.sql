ALTER TABLE entry DROP FOREIGN KEY entry_ended_at_timezone_constraint;
ALTER TABLE entry DROP FOREIGN KEY entry_started_at_timezone_constraint;

ALTER TABLE entry DROP COLUMN ended_at_timezone_id;
ALTER TABLE entry DROP COLUMN started_at_timezone_id;

DROP TABLE timezone;
