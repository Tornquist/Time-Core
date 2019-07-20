'use strict';

var knex = null

module.exports = (dbConfig) => {
  if (typeof dbConfig == 'undefined') dbConfig = null;

  if (dbConfig !== null && knex === null) {
    // Required Settings
    dbConfig.connection = dbConfig.connection || {}
    dbConfig.connection.dateStrings = true

    dbConfig.pool = (dbConfig.pool || {})
    dbConfig.pool.afterCreate = (connection, callback) => {
      connection.query('SET time_zone = "+00:00";', (err) => {
        callback(err, connection)
      })
    }

    // Initialize Knex
    knex = require('knex')(dbConfig);
  }

  return knex;
};
