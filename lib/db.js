'use strict';

var knex = null

module.exports = (dbConfig) => {
  if (typeof dbConfig == 'undefined') dbConfig = null;

  if (dbConfig !== null && knex === null) {
    knex = require('knex')(dbConfig);
  }

  return knex;
};
