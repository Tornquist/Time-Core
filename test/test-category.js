let chai = require('chai');
let chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
let should = chai.should();

const config = require('./setup/config')
const Time = require(process.env.PWD)(config)

describe('Category Module', () => {
  describe('Creating a new category', () => {
    let category = new Time.Category()

    it('will default its properties to null', done => {
      should.equal(category.id, null);
      should.equal(category.name, null);
      done()
    })

    it('does not have other properties', done => {
      should.equal(category.notRealProp, undefined);
      done()
    })
  })

  describe('Loading an existing category', () => {
    describe('That does not exist', () => {
      it('will throw by default', done => {
        let category = new Time.Category(1000)
        category.load()
        .then(success => {
          done(new Error('Expected error to be thrown'))
        })
        .catch(err => {
          if (err.message == "Not found") {
            done()
          } else {
            done(err)
          }
        })
      })

      it('will not throw if load data is turned off')
    })
  })
})
