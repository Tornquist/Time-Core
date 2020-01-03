CREATE TABLE import
(
  id serial primary key,
  created_at timestamp NOT NULL DEFAULT LOCALTIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT LOCALTIMESTAMP,

  user_id BIGINT UNSIGNED NOT NULL,

  expected_categories INT UNSIGNED NOT NULL DEFAULT 0,
  imported_categories INT UNSIGNED NOT NULL DEFAULT 0,
  
  expected_entries INT UNSIGNED NOT NULL DEFAULT 0,
  imported_entries INT UNSIGNED NOT NULL DEFAULT 0,

  complete boolean NOT NULL DEFAULT false,
  success boolean NOT NULL DEFAULT false,

  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TRIGGER import_updated_at BEFORE UPDATE ON import FOR EACH ROW
BEGIN
  SET NEW.updated_at = NOW();
END;
