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

async function fetchRecords(filters, limit = null) {
  let data;
  try {
    let db = require('../lib/db')()

    let query = db.select(
      'account.id', // To avoid adding to data later
      db.raw('GROUP_CONCAT(account_user.user_id) as userIDs')
    ).from('account')
    .leftJoin('account_user', 'account_user.account_id', 'account.id')

    if (filters.id !== undefined) {
      query = query.where('account_id', filters.id)
    } else if (filters.user_id !== undefined) {
      query = query.whereIn(
        'account_id',
        db.select('account_id').from('account_user')
        .where('user_id', filters.user_id)
      )
    } else {
      throw TimeError.Request.INVALID_ACTION
    }

    query = query.groupBy('account.id')

    if (limit !== null) {
      query = query.limit(+limit)
    }

    data = await query
  } catch (error) {
    console.log(error)
    return Promise.reject(TimeError.Data.BAD_CONNECTION)
  }

  let formattedData = data.map(entry => {
    let clone = Object.assign({}, entry)
    clone.userIDs = clone.userIDs.split(',').map(id => +id)
    return clone
  })

  return formattedData
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

  static async fetch(id) {
    let objectData = await fetchRecords({ id }, 1)
    if (objectData.length == 0) {
      return Promise.reject(TimeError.Data.NOT_FOUND)
    }
    return new Account(objectData[0])
  }

  static async findForUser(user) {
    let id = typeof user === "number" ? user : user.id
    let objectData = await fetchRecords({ user_id: id })

    return objectData.map(accountData => new Account(accountData))
  }
}
