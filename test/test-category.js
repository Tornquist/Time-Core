let chai = require('chai');
let chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
let should = chai.should();

const config = require('./setup/config')
const Time = require(process.env.PWD)(config)

describe('Category Module', () => {
  describe('Creating a new category', () => {
    let category = new Time.Category()

    it('will start with no values', done => {
      should.equal(category.id, undefined);
      should.equal(category.name, undefined);
      done()
    })
  })

  describe('Loading an existing category', () => {
    describe('That does not exist', () => {
      it('will throw', () => {
        return Time.Category.fetch(1000)
        .should.be.rejectedWith(Time.Error.Data.NOT_FOUND)
      })
    })
  })
})
