let chai = require('chai');
let chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
let should = chai.should();

const config = require('./setup/config')
const Time = require(process.env.PWD)(config)

describe('Token Module', () => {
  describe('Generating a token for a user', () => {
    let user;

    before(async () => {
      user = new Time.User()
      user.email = "token@test.com"
      await user.setPassword("newPassword")
      await user.save()
    })

    it('Allows a token to be generated', async () => {
      let token = await Time.Token.createForUser(user.id)
      token.user_id.should.eq(user.id)
      token.creation.should.be.a('number')
      token.expiration.should.be.a('number')
      token.token.should.be.a('string')
      token.refresh.should.be.a('string')
    })

    after(async () => {
      if (user.id === undefined) return
      let db = require('../lib/db')()
      await db('user').where('id', user.id).del()
    })
  })
})
