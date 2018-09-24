let chai = require('chai');
let chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
let should = chai.should();

const config = require('./setup/config')
const Time = require(process.env.PWD)(config)

describe('User Module', () => {
  describe('Profile Operations', () => {
    let newUser;

    before(() => {
      newUser = new Time.User()
    })

    describe('Creating a user', () => {
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
    })

    describe("Updating a user", () => {
      it('allows email to be changed', async () => {
        newUser.email = "email_2@webmail.com"
        await newUser.save()
      })

      it('allows password to be changed', async () => {
        await newUser.setPassword("myValidPasswordNumberTwo")
        await newUser.save()
      })
    })

    after(async () => {
      if (newUser.id === undefined) return
      let db = require('../lib/db')()
      await db('user').where('id', newUser.id).del()
    })
  })

  describe('Fetching Users', () => {
    let user;

    before(async () => {
      user = new Time.User()
      user.email = "test@test.com"
      await user.setPassword("newPassword")
      await user.save()
    })

    describe('Via id', () => {
      it('Returns the expected data for a real id', async () => {
        user.id.should.be.a('number')
        let fetchedUser = await Time.User.fetch(user.id)
        fetchedUser.constructor.name.should.eq('User')
      })

      it('Rejects for an invalid id', () => {
        return Time.User.fetch(-1).should.be
        .rejectedWith(Time.Error.Data.NOT_FOUND)
      })
    })

    describe('Via email', () => {
      it('Returns the expected data for a real email', async () => {
        user.email.should.be.a('string')
        let fetchedUser = await Time.User.findWithEmail(user.email)
        fetchedUser.constructor.name.should.eq('User')
      })

      it('Rejects for an invalid id', () => {
        return Time.User.findWithEmail("nathan@notreal.com").should.be
        .rejectedWith(Time.Error.Data.NOT_FOUND)
      })
    })

    after(async () => {
      if (user.id === undefined) return
      let db = require('../lib/db')()
      await db('user').where('id', user.id).del()
    })
  })

  describe('Verifying Users', () => {
    let user;

    before(async () => {
      user = new Time.User()
      user.email = "test@test.com"
      await user.setPassword("newPassword")
      await user.save()
    })

    it('Resolves with a valid password', () => {
      return user.verify("newPassword")
    })

    it('Rejects with an invalid password', () => {
      return user.verify("wrongPassword")
      .should.be.rejectedWith(Time.Error.Authentication.INVALID_PASSWORD)
    })

    after(async () => {
      if (user.id === undefined) return
      let db = require('../lib/db')()
      await db('user').where('id', user.id).del()
    })
  })
})
