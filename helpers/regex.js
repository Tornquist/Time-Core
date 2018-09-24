const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
const passwordRegex = /^([a-zA-Z0-9@*#!%$_-]{8,30})$/

exports.validEmail = (email) => emailRegex.test(email)
exports.validPassword = (password) => passwordRegex.test(password)
