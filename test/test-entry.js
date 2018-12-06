let chai = require('chai');
let chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
let should = chai.should();
let moment = require('moment')

const config = require('./setup/config')
const Time = require(process.env.PWD)(config)

const AccountHelper = require('./helpers/account')

describe('Entry Module', () => {
  let accountTree;
  let category;
  before(async() => {
    AccountHelper.link(Time)
    accountTree = await AccountHelper.createTree()

    category = new Time.Category()
    category.account = accountTree.account
    category.name = "Entry test category"
    await category.save()
  })

  describe('Creating a new entry', () => {
    it('cannot be saved without type and category', () => {
      let e = new Time.Entry()
      try {
        e.save()
      } catch (error) {
        error.should.eq(Time.Error.Request.INVALID_STATE)
        return
      }
      throw new Error("Expected failure")
    })

    it('cannot be saved without category', () => {
      let e = new Time.Entry()
      e.type = Time.Type.Entry.EVENT
      try {
        e.save()
      } catch (error) {
        error.should.eq(Time.Error.Request.INVALID_STATE)
        return
      }
      throw new Error("Expected failure")
    })

    it('cannot be saved without type', () => {
      let e = new Time.Entry()
      e.category = category
      try {
        e.save()
      } catch (error) {
        error.should.eq(Time.Error.Request.INVALID_STATE)
        return
      }
      throw new Error("Expected failure")
    })

    it('can be saved with both type and category', async () => {
      let e = new Time.Entry()
      e.category = category
      e.type = Time.Type.Entry.EVENT
      await e.save()
      e.id.should.be.a('number')
      e.categoryID.should.eq(category.id)
    })
  })

  describe('Loading an entry', () => {
    let entry;
    before(async () => {
      entry = new Time.Entry()
      entry.category = category
      entry.type = Time.Type.Entry.EVENT
      await entry.save()
    })

    it('will return the entry if it exists', async () => {
      let fetchedEvent = await Time.Entry.fetch(entry.id)
      should.not.equal(fetchedEvent, null)
    })

    it('will throw if the entry does not exist', () => {
      return Time.Entry.fetch(-1)
      .should.be.rejectedWith(Time.Error.Data.NOT_FOUND)
    })
  })

  describe('Updating an entry', () => {
    let entry;
    before(async () => {
      entry = new Time.Entry()
      entry.category = category
      entry.type = Time.Type.Entry.EVENT
      await entry.save()
    })

    it('allows started_at to be changed', async () => {
      let startDate = moment('2017-03-19')
      entry.startedAt = startDate
      await entry.save()

      let freshEntry = await Time.Entry.fetch(entry.id)
      moment(freshEntry.props.started_at).isSame(startDate).should.eq(true)
    })

    it('rejets ended_at for event entry', () => {
      try {
        entry.endedAt = moment()
      }
      catch (error) {
        error.should.eq(Time.Error.Request.INVALID_STATE)
        return
      }
      throw new Error("Expected failure")
    })

    it('allows type to be changed', async () => {
      entry.type = Time.Type.Entry.RANGE
      await entry.save()
    })

    it('allows ended_at to be changed', async () => {
      let endDate = moment('2018-04-20')
      entry.endedAt = endDate
      await entry.save()

      let freshEntry = await Time.Entry.fetch(entry.id)
      moment(freshEntry.props.ended_at).isSame(endDate).should.eq(true)
    })

    it('clears ended_at when changing type from range to event', async () => {
      entry.type = Time.Type.Entry.EVENT
      await entry.save()

      should.equal(entry.props.ended_at, null)
    })
  })

  describe('Starting and stopping', () => {
    it('rejects start when type is null', () => {
      let e = new Time.Entry()
      e.category = category
      try { e.start() }
      catch (error) {
        error.should.eq(Time.Error.Request.INVALID_STATE)
        return
      }
      throw new Error("Expected failure")
    })

    it('rejects stop when type is null', () => {
      let e = new Time.Entry()
      e.category = category
      try { e.stop() }
      catch (error) {
        error.should.eq(Time.Error.Request.INVALID_STATE)
        return
      }
      throw new Error("Expected failure")
    })

    it('allows start when type is event', () => {
      let e = new Time.Entry()
      e.category = category
      e.type = Time.Type.Entry.EVENT
      e.start()
    })

    it('allows start when type is range', () => {
      let e = new Time.Entry()
      e.category = category
      e.type = Time.Type.Entry.RANGE
      e.start()
    })

    it('rejects stop when type is entry', () => {
      let e = new Time.Entry()
      e.category = category
      e.type = Time.Type.Entry.EVENT
      try { e.stop() }
      catch (error) {
        error.should.eq(Time.Error.Request.INVALID_STATE)
        return
      }
      throw new Error("Expected failure")
    })

    it('rejects stop when type is range and start hasn`t been called', () => {
      let e = new Time.Entry()
      e.category = category
      e.type = Time.Type.Entry.RANGE
      try { e.stop() }
      catch (error) {
        error.should.eq(Time.Error.Request.INVALID_STATE)
        return
      }
      throw new Error("Expected failure")
    })

    it('allows stop when type is range', () => {
      let e = new Time.Entry()
      e.category = category
      e.type = Time.Type.Entry.RANGE
      e.start()
      e.stop()
    })
  })

  describe('Deleting entries', () => {
    let e;
    before(async () => {
      e = new Time.Entry()
      e.category = category
      e.type = Time.Type.Entry.EVENT
      await e.save()
    })

    it('can be loaded', async () => {
      let fresh = await Time.Entry.fetch(e.id)
      fresh.id.should.eq(e.id)
      fresh.type.should.eq(Time.Type.Entry.EVENT)
    })

    it('can be deleted', async () => {
      await e.delete()
    })

    it('cannot be loaded after it is deleted', () => {
      return Time.Entry.fetch(e.id)
      .should.be.rejectedWith(Time.Error.Data.NOT_FOUND)
    })
  })

  describe('Finding entries', () => {
    let aATree, aBTree;
    let aA, aB;
    let cA, cB, cC, cD;
    let eA, eB, eC, eD, eE, eF, eG, eH;

    before(async() => {
      aATree = (await AccountHelper.createTree())
      aBTree = (await AccountHelper.createTree())

      aA = aATree.account
      aB = aBTree.account

      cA = new Time.Category()
      cA.name = "A"; cA.account = aA; await cA.save()
      cB = new Time.Category()
      cB.name = "B"; cB.account = aA; await cB.save()
      cC = new Time.Category()
      cC.name = "C"; cC.account = aB; await cC.save()
      cD = new Time.Category()
      cD.name = "D"; cD.account = aB; await cD.save()

      eA = new Time.Entry()
      eA.category = cA; eA.type = Time.Type.Entry.EVENT
      eA.startedAt = '2018-01-01 01:01:01'; await eA.save()
      eB = new Time.Entry()
      eB.category = cB; eB.type = Time.Type.Entry.EVENT
      eB.startedAt = '2018-01-02 01:01:01'; await eB.save()
      eC = new Time.Entry()
      eC.category = cC; eC.type = Time.Type.Entry.EVENT
      eC.startedAt = '2018-01-03 01:01:01'; await eC.save()
      eD = new Time.Entry()
      eD.category = cD; eD.type = Time.Type.Entry.EVENT
      eD.startedAt = '2018-01-04 01:01:01'; await eD.save()

      eE = new Time.Entry()
      eE.category = cA; eE.type = Time.Type.Entry.RANGE
      eE.startedAt = '2018-01-05 01:01:01'; await eE.save()
      eF = new Time.Entry()
      eF.category = cB; eF.type = Time.Type.Entry.RANGE
      eF.startedAt = '2018-01-06 01:01:01'; await eF.save()
      eG = new Time.Entry()
      eG.category = cC; eG.type = Time.Type.Entry.RANGE
      eG.startedAt = '2018-01-07 01:01:01'; await eG.save()
      eH = new Time.Entry()
      eH.category = cD; eH.type = Time.Type.Entry.RANGE
      eH.startedAt = '2018-01-08 01:01:01'; await eH.save()
    })

    it('returns an empty array when none exist', async () => {
      let results = await Time.Entry.findFor({ categoryID: -1 })
      results.length.should.eq(0)
    })

    describe('By category', () => {
      it('returns all events when searching by category object', async () => {
        let results = await Time.Entry.findFor({ category: cA })

        let resultIDs = results.map(r => r.id)
        let expectedIDs = [eA.id, eE.id]
        resultIDs.should.have.same.members(expectedIDs)
      })

      it('returns all events when searching by category array', async () => {
        let results = await Time.Entry.findFor({ categories: [cA, cB] })

        let resultIDs = results.map(r => r.id)
        let expectedIDs = [eA.id, eB.id, eE.id, eF.id]
        resultIDs.should.have.same.members(expectedIDs)
      })

      it('returns all events when searching by category id', async () => {
        let results = await Time.Entry.findFor({ categoryID: cC.id })

        let resultIDs = results.map(r => r.id)
        let expectedIDs = [eC.id, eG.id]
        resultIDs.should.have.same.members(expectedIDs)
      })

      it('returns all events when searching by category ids', async () => {
        let results = await Time.Entry.findFor({ categoryIDs: [cA.id, cD.id] })

        let resultIDs = results.map(r => r.id)
        let expectedIDs = [eA.id, eE.id, eD.id, eH.id]
        resultIDs.should.have.same.members(expectedIDs)
      })
    })

    describe('By account', () => {
      it('returns all events when searching by account object', async () => {
        let results = await Time.Entry.findFor({ account: aA })

        let resultIDs = results.map(r => r.id)
        let expectedIDs = [eA.id, eB.id, eE.id, eF.id]
        resultIDs.should.have.same.members(expectedIDs)
      })

      it('returns all events when searching by account array', async () => {
        let results = await Time.Entry.findFor({ accounts: [aA, aB] })

        let resultIDs = results.map(r => r.id)
        let expectedIDs = [eA.id, eB.id, eE.id, eF.id,
                           eC.id, eD.id, eG.id, eH.id]
        resultIDs.should.have.same.members(expectedIDs)
      })

      it('returns all events when searching by account id', async () => {
        let results = await Time.Entry.findFor({ accountID: aB.id })

        let resultIDs = results.map(r => r.id)
        let expectedIDs = [eC.id, eD.id, eG.id, eH.id]
        resultIDs.should.have.same.members(expectedIDs)
      })

      it('returns all events when searching by account ids', async () => {
        let results = await Time.Entry.findFor({ accountIDs: [aA.id, aB.id] })

        let resultIDs = results.map(r => r.id)
        let expectedIDs = [eA.id, eB.id, eE.id, eF.id,
                           eC.id, eD.id, eG.id, eH.id]
        resultIDs.should.have.same.members(expectedIDs)
      })
    })

    describe('By type', () => {
      // Type must be limited by account. Otherwise a ton of old test
      // data will be returned as well. It's too open-ended
      it('returns the correct event entries', async () => {
        let results = await Time.Entry.findFor({
          accounts: [aA, aB],
          type: Time.Type.Entry.EVENT
        })

        let resultIDs = results.map(r => r.id)
        let expectedIDs = [eA.id, eB.id, eC.id, eD.id]
        resultIDs.should.have.same.members(expectedIDs)
      })

      it('returns the correct range entries', async () => {
        let results = await Time.Entry.findFor({
          accounts: [aA, aB],
          type: Time.Type.Entry.RANGE
        })

        let resultIDs = results.map(r => r.id)
        let expectedIDs = [eE.id, eF.id, eG.id, eH.id]
        resultIDs.should.have.same.members(expectedIDs)
      })
    })

    describe('By date', () => {
      // Date must be limited by account. Otherwise a ton of old test
      // data will be returned as well. It's too open-ended

      it('allows greater than', async () => {
        let results = await Time.Entry.findFor({
          accounts: [aA, aB],
          date_gt: '2018-01-03 12:00:00'
        })

        let resultIDs = results.map(r => r.id)
        let expectedIDs = [eD.id, eE.id, eF.id, eG.id, eH.id]
        resultIDs.should.have.same.members(expectedIDs)
      })

      it('allows less than', async () => {
        let results = await Time.Entry.findFor({
          accounts: [aA, aB],
          date_lt: '2018-01-03 12:00:00'
        })

        let resultIDs = results.map(r => r.id)
        let expectedIDs = [eA.id, eB.id, eC.id]
        resultIDs.should.have.same.members(expectedIDs)
      })

      it('allows greater than and less than', async () => {
        let results = await Time.Entry.findFor({
          accounts: [aA, aB],
          date_gt: '2018-01-02 12:00:00',
          date_lt: '2018-01-06 12:00:00'
        })

        let resultIDs = results.map(r => r.id)
        let expectedIDs = [eC.id, eD.id, eE.id, eF.id]
        resultIDs.should.have.same.members(expectedIDs)
      })
    })

    describe('Grouping filters', () => {
      it('succeeds with category and account', async () => {
        let results = await Time.Entry.findFor({ account: aA, category: cB })

        let resultIDs = results.map(r => r.id)
        let expectedIDs = [eB.id, eF.id]
        resultIDs.should.have.same.members(expectedIDs)
      })

      it('succeeds with account and type', async () => {
        let results = await Time.Entry.findFor({
          account: aA,
          type: Time.Type.Entry.RANGE
        })

        let resultIDs = results.map(r => r.id)
        let expectedIDs = [eE.id, eF.id]
        resultIDs.should.have.same.members(expectedIDs)
      })

      it('succeeds with category and type', async () => {
        let results = await Time.Entry.findFor({
          category: cA,
          type: Time.Type.Entry.EVENT
        })

        let resultIDs = results.map(r => r.id)
        let expectedIDs = [eA.id]
        resultIDs.should.have.same.members(expectedIDs)
      })
    })

    after(async () => {
      await AccountHelper.cleanupTree(aATree)
      await AccountHelper.cleanupTree(aBTree)
    })
  })

  describe('Helper methods (for category)', () => {
    describe('Logging events', () => {
      let entry;
      it('will success and return an Entry', async () => {
        entry = await Time.Entry.logFor(category)
        entry.constructor.name.should.eq('Entry')
      })

      it('will have the expected properties', () => {
        entry.type.should.eq(Time.Type.Entry.EVENT)
        entry.startedAt.should.be.a('date')
        should.equal(entry.endedAt, null)
      })
    })

    describe('Starting and stopping entries', () => {
      let entry;
      it('will allow an entry to be started', async () => {
        entry = await Time.Entry.startFor(category)
        entry.constructor.name.should.eq('Entry')
        entry.type.should.eq(Time.Type.Entry.RANGE)
      })

      it('will reject starting when an open entry exists', async () => {
        try {
          await Time.Entry.startFor(category)
        }
        catch (e) {
          e.should.eq(Time.Error.Request.INVALID_ACTION)
          return
        }
        throw new Error("Expected rejection")
      })

      it('will allow an entry to be stopped', async () => {
        let stoppedEntry = await Time.Entry.stopFor(category)
        stoppedEntry.constructor.name.should.eq('Entry')
        stoppedEntry.type.should.eq(Time.Type.Entry.RANGE)

        entry.id.should.eq(stoppedEntry.id)
      })

      it('will reject stopping when no open entries exist', async () => {
        try {
          await Time.Entry.stopFor(category)
        }
        catch (e) {
          e.should.eq(Time.Error.Request.INVALID_ACTION)
          return
        }
        throw new Error("Expected rejection")
      })
    })
  })

  after(async () => {
    await AccountHelper.cleanupTree(accountTree)
  })
})
