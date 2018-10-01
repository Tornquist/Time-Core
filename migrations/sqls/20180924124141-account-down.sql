ALTER TABLE category DROP FOREIGN KEY category_account_constraint;
ALTER TABLE category DROP COLUMN account_id;
DROP TABLE account_user;
DROP TABLE account;
