CREATE TABLE token
(
  id serial primary key,
  created_at timestamp NOT NULL DEFAULT LOCALTIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT LOCALTIMESTAMP,

  user_id BIGINT UNSIGNED NOT NULL,

  access_token varchar(400) NOT NULL,
  access_token_hash varchar(200) NOT NULL,
  access_expires_at timestamp NOT NULL DEFAULT LOCALTIMESTAMP,

  refresh_token varchar(400) NOT NULL,
  refresh_token_hash varchar(200) NOT NULL,
  refresh_expires_at timestamp NOT NULL DEFAULT LOCALTIMESTAMP,

  active boolean NOT NULL DEFAULT true,

  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);
CREATE INDEX access_token_index ON token (access_token);
CREATE INDEX refresh_token_index ON token (refresh_token);
CREATE INDEX token_user_index ON token (user_id);

CREATE TRIGGER token_updated_at BEFORE UPDATE ON token FOR EACH ROW
BEGIN
  SET NEW.updated_at = NOW();
END;
