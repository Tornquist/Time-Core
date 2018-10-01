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

  describe('Finding events', () => {
    let searchCategory;
    let entryA;
    let entryB;
    before(async() => {
      searchCategory = new Time.Category()
      searchCategory.name = "Search Category"
      searchCategory.account = accountTree.account
      await searchCategory.save()

      entryA = new Time.Entry()
      entryA.category = searchCategory
      entryA.type = Time.Type.Entry.EVENT
      await entryA.save()

      entryB = new Time.Entry()
      entryB.category = searchCategory
      entryB.type = Time.Type.Entry.RANGE
      await entryB.save()
    })

    it('returns an empty array when none exist', async () => {
      let results = await Time.Entry.findFor({ category_id: -1 })
      results.length.should.eq(0)
    })

    it('returns all events when searching by category', async () => {
      let results = await Time.Entry.findFor({ category: searchCategory })
      results.length.should.eq(2)
    })

    describe('with type', () => {
      it('returns the correct event entries', async () => {
        let results = await Time.Entry.findFor({
          category: searchCategory,
          type: Time.Type.Entry.EVENT
        })
        results.length.should.eq(1)
        results[0].id.should.eq(entryA.id)
      })

      it('returns the correct range entries', async () => {
        let results = await Time.Entry.findFor({
          category: searchCategory,
          type: Time.Type.Entry.RANGE
        })
        results.length.should.eq(1)
        results[0].id.should.eq(entryB.id)
      })
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

    describe('Starting and stopping events', () => {
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
