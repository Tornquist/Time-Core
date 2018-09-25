'use strict'

let TimeError = require("./TimeError")

function handleRegistration(user, add=true) {
  let id = typeof user === "number" ? user : user.id

  let registered = this.props.userIDs.includes(id)
  let noAction = add && registered || !add && !registered
  if (noAction) return

  let inAdded = this._addedUsers.includes(id)
  let inRemoved = this._removedUsers.includes(id)

  let temp = inRemoved && add || inAdded && !add
  if (temp) {
    let removeFrom = add ? this._removedUsers : this._addedUsers
    removeFrom = removeFrom.filter(userID => userID !== id)
  } else {
    let addTo = add ? this._addedUsers : this._removedUsers
    addTo.push(id)
  }

  if (add) {
    this.props.userIDs.push(id)
  } else {
    this.props.userIDs = this.props.userIDs.filter(userID => userID !== id)
  }
}

function sync() {
  let db = require('../lib/db')()
  let needsInsert = this.id === null
  return db.transaction((trx) => {
    return new Promise((resolve, reject) => {
      if (!needsInsert) return resolve()

      trx.insert({}).into('account')
      .then((ids) => ids[0])
      .then(id => {
        this.id = id
        resolve()
      })
      .catch(reject)
    })
    .then(idSynced => {
      let actions = []
      this._addedUsers.forEach(addUser => {
        let action = trx.insert({
          account_id: this.id,
          user_id: addUser
        }).into('account_user')
        actions.push(action)
      })

      this._removedUsers.forEach(addUser => {
        let action = trx('account_user').where({
          account_id: this.id,
          user_id: addUser
        }).del()
        actions.push(action)
      })

      return Promise.all(actions)
    })
  })
  .then(allSynced => {
    this._addedUsers = []
    this._removedUsers = []
    return this
  })
}

module.exports = class Account {

  constructor(data = {})  {
    this._addedUsers = []
    this._removedUsers = []

    this.id = data.id || null
    this.props = {
      userIDs: data.userIDs || []
    }
  }

  register(user) {
    return handleRegistration.bind(this)(user, true)
  }

  unregister(user) {
    return handleRegistration.bind(this)(user, false)
  }

  save() {
    let neverSaved = this.id === null
    let usersToAdd = this._addedUsers.length > 0
    let usersToRemove = this._removedUsers.length > 0

    let changesToSave = neverSaved || usersToAdd || usersToRemove
    if (!changesToSave) return this

    if (this.props.userIDs.length === 0) {
      return Promise.reject(TimeError.Request.INVALID_STATE)
    }

    return sync.bind(this)()
  }
}
