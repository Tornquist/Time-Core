CREATE TABLE user (
  id serial primary key,
  created_at timestamp NOT NULL DEFAULT LOCALTIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT LOCALTIMESTAMP,

  email varchar(255) NOT NULL,
  password_hash varchar(255) NOT NULL,

  UNIQUE (email)
);

CREATE TRIGGER user_updated_at BEFORE UPDATE ON user FOR EACH ROW
BEGIN
  SET NEW.updated_at = NOW();
END;
