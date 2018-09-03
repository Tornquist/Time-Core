'use strict'

require('dotenv').config();

module.exports = {
  db: {
    client: 'mysql',
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      charset: 'utf8'
    },
    pool: {
      min: 2,
      max: 8
    }
  }
}
