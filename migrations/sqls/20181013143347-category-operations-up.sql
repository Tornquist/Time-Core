CREATE PROCEDURE category_visualize (
  IN in_account_id BIGINT
)
BEGIN
  SELECT
    node.id,
    CONCAT( REPEAT('    ', COUNT(parent.name) - 1), node.name) AS name
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
