/*
  category_visualize will build a tree view to visualize the relationships
  between all of the nodes in a given account.

  This method does not modify any data and should only be used for auditing.
*/
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

/*
  category_setup will make sure a given account id is ready for use.
  This method will make sure a root node exists. This is safe to call multiple
  times. This will only perform actions as-needed.
*/
CREATE PROCEDURE category_setup (
  IN in_account_id BIGINT
)
BEGIN
  DECLARE n_needs_root BOOLEAN;

  SELECT min(lft) is NULL
    INTO n_needs_root
    FROM category
   WHERE account_id = in_account_id;

  IF n_needs_root = 1 THEN
    INSERT INTO category
      (account_id, lft, rgt, name)
    VALUES
      (in_account_id, 1, 2, 'root');
    SELECT LAST_INSERT_ID() as id;
  ELSE
    SELECT id FROM category WHERE account_id = in_account_id AND lft = 1;
  END IF;
END;

/*
  category_add will insert a new node as a child to the specified parent in the
  specified account. The node's name is controlled by in_name.

  This method is destructive, and should be performed in isolation for a given
  account. It can safely be used while other account trees are being modified.
*/
CREATE PROCEDURE category_add (
  IN in_account_id BIGINT,
  IN in_parent_id BIGINT,
  IN in_name VARCHAR(30)
)
BEGIN
  DECLARE n_new_lft INT;
  DECLARE n_new_rgt INT;

  SELECT
    rgt, rgt + 1
  INTO
    n_new_lft, n_new_rgt
  FROM category WHERE id = in_parent_id AND account_id = in_account_id;

  IF n_new_lft IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Category with requested parent_id and account_id not found';
  END IF;

  UPDATE category SET rgt = rgt + 2 WHERE rgt >= n_new_lft AND account_id = in_account_id;
  UPDATE category SET lft = lft + 2 WHERE lft > n_new_lft AND account_id = in_account_id;

  INSERT INTO category
    (name, lft, rgt, account_id)
  VALUES
    (in_name, n_new_lft, n_new_rgt, in_account_id);
  SELECT LAST_INSERT_ID() as id;
END;

/*
  category_delete will delete a node identified by in_node_id and will either
  move all of the children up one level, or destroy them as well.

  This is destructive and non-reversible, and should be performed in isolation
  for a given account.
*/
CREATE PROCEDURE category_delete (
  IN in_node_id BIGINT,
  IN in_delete_children BOOLEAN
)
BEGIN
  DECLARE n_lft INT;
  DECLARE n_rgt INT;
  DECLARE n_width INT;
  DECLARE n_account_id BIGINT;

  SELECT
    rgt - lft + 1, lft, rgt, account_id
  INTO
    n_width, n_lft, n_rgt, n_account_id
  FROM category WHERE id = in_node_id;

  IF n_lft IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Category with requested parent_id not found';
  END IF;

  IF n_width = 2 OR in_delete_children THEN
    DELETE FROM category WHERE lft BETWEEN n_lft AND n_rgt;

    UPDATE category SET rgt = rgt - n_width WHERE rgt > n_rgt AND account_id = n_account_id;
    UPDATE category SET lft = lft - n_width WHERE lft > n_rgt AND account_id = n_account_id;
  ELSE
    DELETE FROM category WHERE id = in_node_id;

    UPDATE category SET rgt = rgt - 1, lft = lft - 1 WHERE lft BETWEEN n_lft AND n_rgt AND account_id = n_account_id;
    UPDATE category SET rgt = rgt - 2 WHERE rgt > n_rgt AND account_id = n_account_id;
    UPDATE category SET lft = lft - 2 WHERE lft > n_rgt AND account_id = n_account_id;
  END IF;
END;

/*
  category_move will move entire trees of nodes to a new parent. This method
  does not allow nodes to be moved onto their own children, but otherwise has
  no limitations.

  It will update the tree automatically if nodes are moved between accounts.
  This is destructive and no other actions should be applied to the tree of
  any accounts impacted by this change while it is being performed.
*/
CREATE PROCEDURE category_move (
  IN in_node_id BIGINT,
  IN in_parent_id BIGINT
)
BEGIN
  DECLARE n_node_lft INT;
  DECLARE n_node_rgt INT;
  DECLARE n_node_width INT;
  DECLARE n_node_account_id BIGINT;
  DECLARE n_node_shift INT;

  DECLARE n_parent_lft INT;
  DECLARE n_parent_rgt INT;
  DECLARE n_parent_account_id BIGINT;

  DECLARE n_node_ids TEXT;

  /* Seed starting values */
  SELECT
    lft, rgt, rgt - lft + 1, account_id
  INTO
    n_node_lft, n_node_rgt, n_node_width, n_node_account_id
  FROM category WHERE id = in_node_id;

  SET n_node_ids := (
    SELECT GROUP_CONCAT(id)
      FROM category
     WHERE lft >= n_node_lft
       AND rgt <= n_node_rgt
       AND account_id = n_node_account_id
  );

  /* Get initial parent values (will be overridden later. Used for validation) */

  SELECT
    lft, rgt, account_id
  INTO
    n_parent_lft, n_parent_rgt, n_parent_account_id
  FROM category WHERE id = in_parent_id;

  if (n_node_account_id = n_parent_account_id) AND n_parent_lft > n_node_lft AND n_parent_rgt < n_node_rgt THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'New parent cannot be child of target';
  END IF;

  /* Shift over original position */
  UPDATE category SET lft = lft - n_node_width
  WHERE account_id = n_node_account_id AND FIND_IN_SET(id, n_node_ids) = 0 AND lft > n_node_lft;

  UPDATE category SET rgt = rgt - n_node_width
  WHERE account_id = n_node_account_id AND FIND_IN_SET(id, n_node_ids) = 0 AND rgt > n_node_rgt;

  /* Make space in target position */
  SELECT
    lft, rgt
  INTO
    n_parent_lft, n_parent_rgt
  FROM category WHERE id = in_parent_id;

  UPDATE category SET lft = lft + n_node_width
  WHERE account_id = n_parent_account_id AND FIND_IN_SET(id, n_node_ids) = 0 AND lft > n_parent_lft;

  UPDATE category SET rgt = rgt + n_node_width
  WHERE account_id = n_parent_account_id AND FIND_IN_SET(id, n_node_ids) = 0 AND rgt >= n_parent_lft;

  /* Adjust all moving widths */
  SET n_node_shift := (n_parent_lft + 1 - n_node_lft);
  UPDATE category SET lft = lft + n_node_shift, rgt = rgt + n_node_shift WHERE FIND_IN_SET(id, n_node_ids) > 0;

  /* Verify moving account ids */
  UPDATE category SET account_id = n_parent_account_id WHERE FIND_IN_SET(id, n_node_ids) > 0;
END;
