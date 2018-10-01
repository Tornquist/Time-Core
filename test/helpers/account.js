const UserHelper = require('./user')

let storedTime = null;

let link = (providedTime) => {
  storedTime = providedTime
  UserHelper.link(providedTime)
}

let create = async (user, Time) => {
  let newAccount = new (storedTime || Time).Account()
  newAccount.register(user)
  await newAccount.save()
  return newAccount
}

let createTree = async (Time) => {
  let user = await UserHelper.create(Time)
  user = user

  let account = await create(user.user, Time)
  return {
    account,
    user
  }
}

let cleanup = async (account = {}, Time) => {
  let id = account
  await (storedTime || Time)._db('account').where('id', account.id).del()
}

let cleanupTree = async (tree = {}, Time) => {
  await cleanup(tree.account, Time)
  await UserHelper.cleanup(tree.user, Time)
}

module.exports = {
  link,
  create,
  createTree,
  cleanup,
  cleanupTree
}
