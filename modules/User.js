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

module.exports = class User {
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
}
