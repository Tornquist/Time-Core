let chai = require('chai');
let chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
let should = chai.should();

const config = require('./setup/config')
const Time = require(process.env.PWD)(config)

describe('Type Module', () => {
  it('contains the expected types', done => {
    let expectedTypes = ['Entry']
    let foundTypes = Object.keys(Time.Type)

    expectedTypes.length.should.eq(foundTypes.length)
    expectedTypes.forEach(expectedType => {
      foundTypes.includes(expectedType).should.eq(true)
    })
    done()
  })

  describe('Entry Types', () => {
    it('contains the expected types', done => {
      Time.Type.Entry.RANGE.should.eq('range')
      Time.Type.Entry.EVENT.should.eq('event')
      Object.keys(Time.Type.Entry).length.should.eq(2)
      done()
    })
  })
})
