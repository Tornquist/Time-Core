let chai = require('chai');
let chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
let should = chai.should();

const config = require('./setup/config')
const Time = require(process.env.PWD)(config)

describe('User Module', () => {
  describe('Creating a user', () => {
    let newUser;

    before(() => {
      newUser = new Time.User()
    })

    it('rejects invalid email addresses', () => {
      try {
        newUser.email = "this_is_not_an_email"
      } catch(e) {
        e.should.eq(Time.Error.Data.INCORRECT_FORMAT)
        return
      }
      throw new Error("Expected failure")
    })

    it('accepts valid email addresses', done => {
      newUser.email = "email@webmail.com"
      done()
    })

    it('rejects invalid passwords', () => {
      return newUser.setPassword("short")
      .should.be.rejectedWith(Time.Error.Data.INCORRECT_FORMAT)
    })

    it('accepts valid passwords', async () => {
      let testPass = "myValidPassword"
      return await newUser.setPassword(testPass)
    })

    it('can be created successfully', async () => {
      await newUser.save()

      newUser.id.should.be.a('number')
    })

    after(async () => {
      if (newUser.id === undefined) return
      let db = require('../lib/db')()
      await db('user').where('id', newUser.id).del()
    })
  })
})
