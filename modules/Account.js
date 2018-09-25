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
    this.props.userIds = this.props.userIds.filter(userID => userID !== id)
  }
}

module.exports = class Account {

  constructor(data = {})  {
    this._addedUsers = []
    this._removedUsers = []

    this.id = data.id
    this.props = {
      userIDs: data.userIDs || []
    }
  }

  register(user) {
    handleRegistration.bind(this)(user, true)
  }

  unregister(user) {
    handleRegistration.bind(this)(user, false)
  }

  save() {
    let neverSaved = this.id == null
    let usersToAdd = this._addedUsers.length > 0
    let usersToRemove = this._removedUsers.length > 0

    let changesToSave = neverSaved || usersToAdd || usersToRemove
    if (!changesToSave) return this

    if (this.props.userIDs.length === 0) {
      return Promise.reject(TimeError.Request.INVALID_STATE)
    }

    throw new Error('Not implemented')
  }
}
