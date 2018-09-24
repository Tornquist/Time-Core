const bcrypt = require('bcrypt')
const crypto = require('crypto')

exports.hash = async (secret) => {
  const saltRounds = 12
  let hash = await bcrypt.hash(secret, saltRounds)
  return hash
}

exports.verify = async (secret, hash) => {
  return await bcrypt.compare(secret, hash)
}

exports.shortHash = (secret) => {
  return crypto.createHash('md5').update(secret.substr(-12)).digest('hex')
}
