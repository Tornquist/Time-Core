let chai = require('chai');
let chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
let should = chai.should();

const Type = require('../modules/Type')

describe('Type Module', () => {
  it('contains the expected types', done => {
    let expectedTypes = ['Entry']
    let foundTypes = Object.keys(Type)

    expectedTypes.length.should.eq(foundTypes.length)
    expectedTypes.forEach(expectedType => {
      foundTypes.includes(expectedType).should.eq(true)
    })
    done()
  })

  describe('Entry Types', () => {
    it('contains the expected types', done => {
      Type.Entry.RANGE.should.eq('range')
      Type.Entry.EVENT.should.eq('event')
      Object.keys(Type.Entry).length.should.eq(2)
      done()
    })
  })
})
