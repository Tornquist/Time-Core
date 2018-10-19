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
  DECLARE n_new_lft INT;
  DECLARE n_new_rgt INT;
  SELECT rgt, rgt + 1 INTO n_new_lft, n_new_rgt FROM category WHERE id = in_parent_id AND account_id = in_account_id;
  IF n_new_lft IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Category with requested parent_id and account_id not found';
  END IF;
  UPDATE category SET rgt = rgt + 2 WHERE rgt >= n_new_lft AND account_id = in_account_id;
  UPDATE category SET lft = lft + 2 WHERE lft > n_new_lft AND account_id = in_account_id;
  INSERT INTO category(name, lft, rgt, account_id) VALUES(in_name, n_new_lft, n_new_rgt, in_account_id);
  SELECT LAST_INSERT_ID() as id;
END;

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

CREATE PROCEDURE category_move (
  IN in_node_id BIGINT,
  IN in_parent_id BIGINT
)
BEGIN
  /* Seed starting values */
  SET @n_node_lft := (SELECT lft FROM category WHERE id = in_node_id);
  SET @n_node_rgt := (SELECT rgt FROM category WHERE id = in_node_id);
  SET @n_node_account_id := (SELECT account_id FROM category WHERE id = in_node_id);
  SET @n_node_width := (@n_node_rgt - @n_node_lft + 1);
  SET @n_node_ids := (SELECT GROUP_CONCAT(id) FROM category WHERE lft >= @n_node_lft AND rgt <= @n_node_rgt AND account_id = @n_node_account_id);

  /* Get initial parent values (will be overridden later. Used for validation) */
  SET @n_parent_lft := (SELECT lft FROM category WHERE id = in_parent_id);
  SET @n_parent_rgt := (SELECT rgt FROM category WHERE id = in_parent_id);
  SET @n_parent_account_id := (SELECT account_id FROM category WHERE id = in_parent_id);

  if (@n_node_account_id = @n_parent_account_id) AND @n_parent_lft > @n_node_lft AND @n_parent_rgt < @n_node_rgt THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'New parent cannot be child of target';
  END IF;

  /* Shift over original position */
  UPDATE category SET lft = lft - @n_node_width WHERE account_id = @n_node_account_id AND FIND_IN_SET(id, @n_node_ids) = 0 AND lft > @n_node_lft;
  UPDATE category SET rgt = rgt - @n_node_width WHERE account_id = @n_node_account_id AND FIND_IN_SET(id, @n_node_ids) = 0 AND rgt > @n_node_rgt;

  /* Make space in target position */
  SET @n_parent_lft := (SELECT lft FROM category WHERE id = in_parent_id);
  SET @n_parent_rgt := (SELECT rgt FROM category WHERE id = in_parent_id);
  SET @n_parent_account_id := (SELECT account_id FROM category WHERE id = in_parent_id);
  UPDATE category SET lft = lft + @n_node_width WHERE account_id = @n_parent_account_id AND FIND_IN_SET(id, @n_node_ids) = 0 AND lft > @n_parent_lft;
  UPDATE category SET rgt = rgt + @n_node_width WHERE account_id = @n_parent_account_id AND FIND_IN_SET(id, @n_node_ids) = 0 AND rgt >= @n_parent_lft;

  /* Adjust all moving widths */
  SET @n_node_shift := (@n_parent_lft + 1 - @n_node_lft);
  UPDATE category SET lft = lft + @n_node_shift, rgt = rgt + @n_node_shift WHERE FIND_IN_SET(id, @n_node_ids) > 0;

  /* Verify moving account ids */
  UPDATE category SET account_id = @n_parent_account_id WHERE FIND_IN_SET(id, @n_node_ids) > 0;
END;
