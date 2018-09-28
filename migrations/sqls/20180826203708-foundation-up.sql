/* Entry Type */
CREATE TABLE entry_type (
  id serial primary key,
  name varchar(6) NOT NULL
);
CREATE INDEX entry_type_name_index ON entry_type (name);
INSERT INTO entry_type (name) VALUES ('range');
INSERT INTO entry_type (name) VALUES ('event');

/* Category */
CREATE TABLE category (
  id serial primary key,
  created_at timestamp NOT NULL DEFAULT LOCALTIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT LOCALTIMESTAMP,
  parent_id BIGINT UNSIGNED NULL,
  name varchar(30) NOT NULL,

  FOREIGN KEY (parent_id) REFERENCES category(id)
);

CREATE TRIGGER category_updated_at BEFORE UPDATE ON category FOR EACH ROW
BEGIN
  SET NEW.updated_at = NOW();
END;

/* Entry */
CREATE TABLE entry (
  id serial primary key,
  created_at timestamp NOT NULL DEFAULT LOCALTIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT LOCALTIMESTAMP,
  type_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  started_at timestamp NOT NULL DEFAULT LOCALTIMESTAMP,
  ended_at timestamp NULL,

  FOREIGN KEY (type_id) REFERENCES entry_type(id),
  FOREIGN KEY (category_id) REFERENCES category(id) ON DELETE CASCADE
);

CREATE TRIGGER entry_updated_at BEFORE UPDATE ON entry FOR EACH ROW
BEGIN
  SET NEW.updated_at = NOW();
END;
