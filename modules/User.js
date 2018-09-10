'use strict'

const TimeError = require("./TimeError")

const regexHelper = require('../helpers/regex')

function insertRecord() {
  let db = require('../lib/db')()
  let data = {
    email: this.props.email,
    password_hash: this.props.password_hash
  }
  return db.insert(data).into('user')
  .then(results => {
    this.id = results[0]
    return this
  })
}

function updateRecord() {
  let db = require('../lib/db')()
  let data = {}
  this._modifiedProps.forEach(prop => {
    data[prop] = this.props[prop]
  })
  return db('user').update(data).where('id', this.id)
  .then(updated => {
    this._modifiedProps = []
    return this
  })
}

async function fetchRecords(filters, limit = null) {
  let data;
  try {
    let query = require('../lib/db')().select(
      'id', // To avoid adding to data later
      'email',
      'password_hash'
    ).from('user')
    .where(filters)

    if (limit !== null) {
      query = query.limit(+limit)
    }

    data = await query
  } catch (error) {
    return Promise.reject(TimeError.Data.BAD_CONNECTION)
  }

  return data
}

module.exports = class User {
  get email() { return this.props.email }
  set email(newEmail) {
    if (!regexHelper.validEmail(newEmail)) {
      throw TimeError.Data.INCORRECT_FORMAT
    }

    this.props.email = newEmail
    this._modifiedProps.push('email')
  }

  async setPassword(newPassword) {
    if (!regexHelper.validPassword(newPassword)) {
      throw TimeError.Data.INCORRECT_FORMAT
    }

    const bcrypt = require('bcrypt')
    const saltRounds = 12
    let hash = await bcrypt.hash(newPassword, saltRounds)
    this.props.password_hash = hash
    this._modifiedProps.push('password_hash')
  }

  constructor(data = {}) {
    this._modifiedProps = []

    this.id = data.id
    this.props = {
      email: data.email,
      password_hash: data.password_hash
    }
  }

  save() {
    let neverSaved = this.id == null
    let updatedFields = this._modifiedProps.length > 0

    if (!(neverSaved || updatedFields)) { return this }

    return neverSaved ?
      insertRecord.bind(this)() :
      updateRecord.bind(this)()
  }

  async verify(password) {
    const bcrypt = require('bcrypt')
    let res = await bcrypt.compare(password, this.props.password_hash)
    if (res) return
    throw TimeError.Authentication.INVALID_PASSWORD
  }

  static async fetch(id) {
    let objectData = await fetchRecords({ id }, 1)
    if (objectData.length == 0) {
      return Promise.reject(TimeError.Data.NOT_FOUND)
    }
    return new User(objectData[0])
  }

  static async findWithEmail(email) {
    let objectData = await fetchRecords({ email }, 1)
    if (objectData.length == 0) {
      return Promise.reject(TimeError.Data.NOT_FOUND)
    }
    return new User(objectData[0])
  }
}
