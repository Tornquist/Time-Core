const UUIDv4 = require('uuid/v4')

let storedTime = null;

exports.link = (providedTime) => {
  storedTime = providedTime
}

exports.create = async (email = null, Time) => {
  let newUser = new (storedTime || Time).User()

  let uuid = UUIDv4()
  email = email || `${uuid.substring(0,8)}@${uuid.substring(24,36)}.com`
  let password = "defaultPassword"

  newUser.email = email
  await newUser.setPassword(password)

  await newUser.save()

  return {
    email: email,
    password: password,
    user: newUser
  }
}

exports.cleanup = async (user = {}, Time) => {
  let id = user.id || user.user.id
  await (storedTime || Time)._db('user').where('id', id).del()
}
