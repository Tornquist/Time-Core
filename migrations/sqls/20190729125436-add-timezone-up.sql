CREATE TABLE timezone (
  id serial primary key,
  name varchar(40) not null,
  unique(name)
);

ALTER TABLE entry ADD COLUMN started_at_timezone_id BIGINT UNSIGNED NULL AFTER started_at;
ALTER TABLE entry ADD COLUMN ended_at_timezone_id BIGINT UNSIGNED NULL AFTER ended_at;

ALTER TABLE entry ADD CONSTRAINT entry_started_at_timezone_constraint
  FOREIGN KEY (started_at_timezone_id) REFERENCES timezone (id);

ALTER TABLE entry ADD CONSTRAINT entry_ended_at_timezone_constraint
  FOREIGN KEY (ended_at_timezone_id) REFERENCES timezone (id);
