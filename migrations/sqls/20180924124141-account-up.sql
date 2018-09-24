CREATE TABLE account
(
  id serial primary key
);

CREATE TABLE account_user
(
  id serial primary key,
  account_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,

  FOREIGN KEY (account_id) REFERENCES account(id),
  FOREIGN KEY (user_id) REFERENCES user(id),

  UNIQUE KEY account_user_link (account_id, user_id)
);

ALTER TABLE category ADD COLUMN account_id BIGINT UNSIGNED NOT NULL AFTER updated_at;
ALTER TABLE category ADD CONSTRAINT category_account_constraint
  FOREIGN KEY (account_id) REFERENCES account (id) ON DELETE CASCADE;
