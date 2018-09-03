#!/bin/bash

while read line; do export "$line";
done < .env

echo "Dropping existing database ..."
MYSQL_PWD=${DB_PASS} mysql -e "DROP DATABASE ${DB_NAME}" -u${DB_USER}
MYSQL_PWD=${DB_PASS} mysql -e "CREATE DATABASE ${DB_NAME}" -u${DB_USER}

echo "Migrating new database up to latest schema ..."
npm run db-up > logs/db-migrate.log

exit 0
