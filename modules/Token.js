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

module.exports = class Token {
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
      Promise.reject(new Error('Not yet available')) // updateRecord.bind(this)()
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
}
