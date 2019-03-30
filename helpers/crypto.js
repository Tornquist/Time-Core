const bcrypt = require('bcrypt')
const crypto = require('crypto')

let lightHash = (secret) => {
  let salt = ((require('../lib/config')() || {}).token || {}).salt || ""
  let roundOne = crypto.createHash('sha256').update(secret).digest('hex')
  let roundTwo = crypto.createHash('sha256').update(roundOne + salt).digest('hex')
  return roundTwo
}

let heavyHash = async (secret) => {
  const saltRounds = 12
  let hash = await bcrypt.hash(secret, saltRounds)
  return hash
}

exports.hash = (secret, light = false) => {
  return light ? lightHash(secret) : heavyHash(secret)
}

exports.verify = async (secret, hash, light = false) => {
  if (light) {
    let secretHash = lightHash(secret)
    return secretHash == hash
  } else {
    return await bcrypt.compare(secret, hash)
  }
}

exports.shortHash = (secret) => {
  return crypto.createHash('md5').update(secret.substr(-12)).digest('hex')
}
