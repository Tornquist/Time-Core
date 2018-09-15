let chai = require('chai');
let chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
let should = chai.should();

const config = require('./setup/config')
const Time = require(process.env.PWD)(config)

describe('Token Module', () => {
  let user;
  let token = null;

  before(async () => {
    user = new Time.User()
    user.email = "token@test.com"
    await user.setPassword("newPassword")
    await user.save()
  })

  describe('Generating a token for a user', () => {
    it('Allows a token to be generated', async () => {
      token = await Time.Token.createForUser(user.id)
      token.user_id.should.eq(user.id)
      token.creation.should.be.a('number')
      token.expiration.should.be.a('number')
      token.token.should.be.a('string')
      token.refresh.should.be.a('string')
    })
  })

  describe('Validating a token', () => {
    describe('With a valid token', () => {
      it('Verifies as an access token by default', async () => {
        let result = await Time.Token.verify(token.token)
        result.props.user_id.should.eq(token.user_id)
      })

      it('Verifies explicitly as access', async () => {
        let result = await Time.Token.verify(token.token, Time.Type.Token.ACCESS)
        result.props.user_id.should.eq(token.user_id)
      })

      it('Verifies explicitly as refresh', async () => {
        let result = await Time.Token.verify(token.refresh, Time.Type.Token.REFRESH)
        result.props.user_id.should.eq(token.user_id)
      })

      it('Rejects invalid token types', () => {
        return Time.Token.verify("MADE UP", "MADE UP")
        .should.be.rejectedWith(Time.Error.Request.INVALID_TYPE)
      })
    })

    describe('With invalid data', () => {
      it('Rejects when a matching token is not found', () => {
        return Time.Token.verify("MADE UP")
        .should.be.rejectedWith(Time.Error.Authentication.UNIQUE_TOKEN_NOT_FOUND)
      })

      describe('When the token is expired', () => {
        let tokenID;
        let accessExpiration;
        let refreshExpiration;
        before(async () => {
          let db = require('../lib/db')()
          let result = await db('token').select(
            'id',
            'access_expires_at',
            'refresh_expires_at'
          ).orderBy('id', 'desc').limit(1)
          tokenID = result[0].id
          accessExpiration = result[0].access_expires_at
          refreshExpiration = result[0].refresh_expires_at

          let expiredDate = db.raw('DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 HOUR)')
          await db('token').update({
            access_expires_at: expiredDate,
            refresh_expires_at: expiredDate
          })
          .where('id', tokenID)
        })

        it('Rejects access as expected', () => {
          return Time.Token.verify(token.token)
          .should.be.rejectedWith(Time.Error.Authentication.TOKEN_EXPIRED)
        })

        it('Rejects refresh as expected', () => {
          return Time.Token.verify(token.refresh, Time.Type.Token.REFRESH)
          .should.be.rejectedWith(Time.Error.Authentication.TOKEN_EXPIRED)
        })

        after(async () => {
          let db = require('../lib/db')()
          await db('token').update({
            access_expires_at: accessExpiration,
            refresh_expires_at: refreshExpiration
          })
          .where('id', tokenID)
        })
      })

      describe('When the token is inactive', () => {
        let tokenID;
        before(async () => {
          let db = require('../lib/db')()
          let result = await db('token').select(
            'id'
          ).orderBy('id', 'desc').limit(1)
          tokenID = result[0].id

          await db('token').update('active', false)
          .where('id', tokenID)
        })

        it('Rejects as expected', () => {
          return Time.Token.verify(token.token)
          .should.be.rejectedWith(Time.Error.Authentication.TOKEN_EXPIRED)
        })

        after(async () => {
          let db = require('../lib/db')()
          await db('token').update('active', true)
          .where('id', tokenID)
        })
      })

      describe('When the short token matches, but the token is different', () => {
        it('Rejects as expected', () => {
          let replacement = "changed"
          let newString = replacement + token.token.substring(replacement.length)

          return Time.Token.verify(newString)
          .should.be.rejectedWith(Time.Error.Authentication.TOKEN_INVALID)
        })
      })
    })
  })

  after(async () => {
    if (user.id === undefined) return
    let db = require('../lib/db')()
    await db('user').where('id', user.id).del()
  })
})
