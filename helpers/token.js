let generateToken = () => {
  let eligible = "abcdefghijklnmopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let maxIndex = eligible.length;

  let nowHex = Date.now().toString(16);
  if (Math.random() > 0.5) nowHex = nowHex.toUpperCase();

  let pidHex = process.pid.toString(16)
  let tokenComponents = ['', pidHex];

  for (let i = 0; i < 2; i++) {
    let max = 15 + 10*i;
    let min = 5 + 10*i;
    let segmentLength = Math.floor(Math.random() * (max - min)) + min;
    while (tokenComponents[i].length < segmentLength) {
      tokenComponents[i] += eligible[Math.floor(Math.random() * maxIndex)];
    }
  }

  let tokenParts = [
    tokenComponents[0].length.toString(16),
    tokenComponents[0],
    nowHex.length.toString(16),
    nowHex,
    tokenComponents[1]
  ]

  let token = tokenParts.join('')

  return token
}

let getTokenCreationTime = (token) => {
  let prefixLength = parseInt(token[0], 16);
  let dateLength = parseInt(token[prefixLength + 1], 16)
  let dateStart = prefixLength + 2
  let msDate = parseInt(token.substr(dateStart, dateLength).toLowerCase(), 16)
  return msDate
}

let getTokenPair = () => {
  let newAccessToken = generateToken()
  let atTime = getTokenCreationTime(newAccessToken)
  let atLifeSpan = 3600 * 4 // 4 hours
  let newRefreshToken = generateToken()
  let rtTime = getTokenCreationTime(newRefreshToken)
  let rtLifeSpan = 3600 * 24 * 14 // 2 weeks

  let accessTokenData = {
    creation: atTime,
    expiration: atTime + (atLifeSpan * 1000),
    token: newAccessToken
  };

  let refreshTokenData = {
    creation: rtTime,
    expiration: rtTime + (rtLifeSpan * 1000),
    token: newRefreshToken
  };

  return {
    access: accessTokenData,
    refresh: refreshTokenData
  }
}

exports.generateToken = generateToken
exports.getTokenCreationTime = getTokenCreationTime
exports.getTokenPair = getTokenPair
