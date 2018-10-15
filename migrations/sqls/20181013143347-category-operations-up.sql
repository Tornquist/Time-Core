CREATE PROCEDURE category_visualize (
  IN in_account_id BIGINT
)
BEGIN
  SELECT
    node.id,
    node.lft,
    node.rgt,
    CONCAT( REPEAT('|    ', COUNT(parent.name) - 1), node.name) AS name
  FROM
    category AS node,
    category AS parent
  WHERE
    node.lft BETWEEN parent.lft AND parent.rgt
    AND node.account_id = in_account_id
    AND parent.account_id = in_account_id
  GROUP BY node.id
  ORDER BY node.lft;
END;

CREATE PROCEDURE category_add (
  IN in_account_id BIGINT,
  IN in_parent_id BIGINT,
  IN in_name VARCHAR(30)
)
BEGIN
  DECLARE new_lft INT;
  SELECT rgt INTO new_lft FROM category WHERE id = in_parent_id AND account_id = in_account_id;
  IF new_lft IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Category with requested parent_id and account_id not found';
  END IF;
  UPDATE category SET rgt = rgt + 2 WHERE rgt >= new_lft AND account_id = in_account_id;
  UPDATE category SET lft = lft + 2 WHERE lft > new_lft AND account_id = in_account_id;
  INSERT INTO category(name, lft, rgt, account_id) VALUES(in_name, new_lft, new_lft + 1, in_account_id);
  SELECT LAST_INSERT_ID() as id;
END;

CREATE PROCEDURE category_delete (
  IN in_parent_id BIGINT,
  IN in_delete_children BOOLEAN
)
BEGIN
  DECLARE n_lft INT;
  DECLARE n_rgt INT;
  DECLARE n_width BOOLEAN;
  DECLARE n_account_id BIGINT;

  SELECT
    rgt - lft, lft, rgt, account_id
  INTO
    n_width, n_lft, n_rgt, n_account_id
  FROM category WHERE id = in_parent_id;

  IF n_lft IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Category with requested parent_id not found';
  END IF;

  IF n_width = 1 OR in_delete_children THEN
    DELETE FROM category WHERE lft BETWEEN n_lft AND n_rgt;

    UPDATE category SET rgt = rgt - (n_width + 1) WHERE rgt > n_rgt AND account_id = n_account_id;
    UPDATE category SET lft = lft - (n_width + 1) WHERE lft > n_rgt AND account_id = n_account_id;
  ELSE
    DELETE FROM category WHERE id = in_parent_id;

    UPDATE category SET rgt = rgt - 1, lft = lft - 1 WHERE lft BETWEEN n_lft AND n_rgt AND account_id = n_account_id;
    UPDATE category SET rgt = rgt - 2 WHERE rgt > n_rgt AND account_id = n_account_id;
    UPDATE category SET lft = lft - 2 WHERE lft > n_rgt AND account_id = n_account_id;
  END IF;
END;
