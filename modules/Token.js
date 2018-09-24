const TimeError = require("./TimeError")
const Type = require('./Type')

const tokenHelper = require('../helpers/token')
const cryptoHelper = require('../helpers/crypto')
const moment = require('moment')

function insertRecord() {
  let db = require('../lib/db')()
  return db.insert(this.props).into('token')
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
  return db('token').update(data).where('id', this.id)
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
      'user_id',
      'access_token',
      'access_token_hash',
      'access_expires_at',
      'refresh_token',
      'refresh_token_hash',
      'refresh_expires_at',
      'active'
    ).from('token')
    .where(filters)

    if (limit !== null) {
      query = query.limit(+limit)
    }

    data = await query
  } catch (error) {
    return Promise.reject(TimeError.Data.BAD_CONNECTION)
  }

  let formattedData = data.map(entry => {
    let clone = Object.assign({}, entry)
    clone.active = clone.active === 1
    return clone
  })

  return formattedData
}

module.exports = class Token {
  get active() { return this.props.active }
  set active(newActive) {
    this.props.active = newActive
    this._modifiedProps.push('active')
  }

  constructor(data = {}) {
    this._modifiedProps = []

    this.id = data.id
    this.props = {
      user_id: data.user_id,
      access_token: data.access_token,
      access_token_hash: data.access_token_hash,
      access_expires_at: data.access_expires_at,
      refresh_token: data.refresh_token,
      refresh_token_hash: data.refresh_token_hash,
      refresh_expires_at: data.refresh_expires_at,
      active: data.active
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

  async refresh() {
    let newToken = Token.createForUser(this.props.user_id)
    this.active = false
    await this.save()
    return newToken
  }

  static async createForUser(id) {
    let newTokens = tokenHelper.getTokenPair()

    let shortAccess = cryptoHelper.shortHash(newTokens.access.token)
    let hashedAccess = await cryptoHelper.hash(newTokens.access.token)
    let shortRefresh = cryptoHelper.shortHash(newTokens.refresh.token)
    let hashedRefresh = await cryptoHelper.hash(newTokens.refresh.token)

    let accessCreatedAt = moment(newTokens.access.creation).format("YYYY-MM-DD HH:mm:ss")
    let accessExpiresAt = moment(newTokens.access.expiration).format("YYYY-MM-DD HH:mm:ss")
    let refreshCreatedAt = moment(newTokens.refresh.creation).format("YYYY-MM-DD HH:mm:ss")
    let refreshExpiresAt = moment(newTokens.refresh.expiration).format("YYYY-MM-DD HH:mm:ss")

    let data = {
      user_id: id,
      access_token: shortAccess,
      access_token_hash: hashedAccess,
      access_expires_at: accessExpiresAt,
      refresh_token: shortRefresh,
      refresh_token_hash: hashedRefresh,
      refresh_expires_at: refreshExpiresAt,
      active: true
    }

    let token = new Token(data)
    await token.save()

    return {
      user_id: id,
      creation: newTokens.access.creation,
      expiration: newTokens.access.expiration,
      token: newTokens.access.token,
      refresh: newTokens.refresh.token
    }
  }

  static async fetch(token, type=Type.Token.ACCESS) {
    let lookupKey = cryptoHelper.shortHash(token)

    let validType = Object.values(Type.Token).includes(type)
    if (!validType) throw TimeError.Request.INVALID_TYPE
    let lookupColumn = type + '_token'

    let filters = {}
    filters[lookupColumn] = lookupKey
    let records = await fetchRecords(filters)

    if (records.length != 1) {
      throw TimeError.Authentication.UNIQUE_TOKEN_NOT_FOUND
    }

    return new Token(records[0])
  }

  static async verify(token, type=Type.Token.ACCESS) {
    let tokenObject = await Token.fetch(token, type)

    let inactive = !tokenObject.props.active
    let expirationColumn = type + '_expires_at'
    let expirationDate = moment(tokenObject.props[expirationColumn])
    let expired = moment().isAfter(expirationDate)
    if (inactive || expired) {
      throw TimeError.Authentication.TOKEN_EXPIRED
    }

    let tokenColumn = type + '_token_hash'
    let valid = await cryptoHelper.verify(token, tokenObject.props[tokenColumn])

    if (!valid) {
      throw TimeError.Authentication.TOKEN_INVALID
    }

    return tokenObject
  }
}
