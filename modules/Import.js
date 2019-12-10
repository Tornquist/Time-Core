'use strict'

const joi = require('@hapi/joi')
const TimeError = require('./TimeError')
const dateHelper = require('../helpers/date')

async function insertRecord() {
  let db = require('../lib/db')()

  if (
    this.props.user_id === undefined ||
    this.props.expected_categories === undefined ||
    this.props.expected_entries === undefined
  ) throw TimeError.Request.INVALID_STATE

  let data = {
    user_id: this.props.user_id,
    expected_categories: this.props.expected_categories,
    imported_categories: 0,
    expected_entries: this.props.expected_entries,
    imported_entries: 0,
    complete: false,
    success: false
  }
  return db('import').insert(data)
  .then(results => {
    this.id = results[0]
    this.props.created_at = new Date()
    this.props.updated_at = new Date()
    return this
  })
}

async function fetchRecords(filters, limit = null) {
  let db = require('../lib/db')()

  let data;
  try {
    let query = db.select(
      'id',
      'created_at',
      'updated_at',
      'user_id',
      'expected_categories',
      'imported_categories',
      'expected_entries',
      'imported_entries',
      'complete',
      'success'
    ).from('import')
   
    if (Object.keys(filters).length > 0)
      query = query.where(filters)

    if (limit !== null)
      query = query.limit(+limit)

    data = await query
    
    data = data.map(d => {
      d.complete = d.complete === 1
      d.success = d.success === 1
      return d
    })
  } catch (error) {
    return Promise.reject(TimeError.Data.BAD_CONNECTION)
  }

  return data
}

const validateNames = (node, root = true) => {
  // Only the top level name can be an empty string
  let emptyName = node.name.length === 0
  let validName = !emptyName || emptyName && root

  let validChildren = node.children
    .map((c) => validateNames(c, false))
    .reduce((a, c) => a && c, true)

  return validName && validChildren
}

const countAll = (group) => {
  let childrenCounts = group.children
    .map(countAll)
    .reduce((acc, cur) => {
      return {
        categories: acc.categories + cur.categories,
        entries: acc.entries + cur.entries
      }
    }, { categories: 0, entries: 0 })

  return {
    categories: childrenCounts.categories + 1,
    entries: childrenCounts.entries + group.events.length + group.ranges.length
  }
}

const performImport = async (importObj, data) => {
  try {
    // Delayed to avoid import dependency
    let Account = require('./Account')
    let Category = require('./Category')
    let Entry = require('./Entry')
    let Type = require('./Type')
    let db = require('../lib/db')()

    let account = new Account()
    account.register(importObj.userID) // TODO: Allow delayed registration on success only
    await account.save()
    
    let createdCategories = 0
    let updateCreatedCategories = async () => {
      importObj.props.imported_categories = createdCategories
      await db('import')
        .update('imported_categories', createdCategories)
        .where('id', importObj.id)
    }

    let sequentiallyCreateCategories = async (parent, tree) => {
      if (tree.name.length === 0) {
        for (let i = 0; i < tree.children.length; i++) {
          let child = tree.children[i]
          await sequentiallyCreateCategories(undefined, child)
        }
        return
      }
      
      let category = new Category({
        name: tree.name,
        accountID: account.id,
        parentID: parent
      })
      await category.save()
      createdCategories = createdCategories + 1
      tree.category_id = category.id

      if (createdCategories % 10 === 0) {
        await updateCreatedCategories()
      }

      for (let i = 0; i < tree.children.length; i++) {
        let child = tree.children[i]
        await sequentiallyCreateCategories(category.id, child)
      }
    }
    await sequentiallyCreateCategories(undefined, data)
    await updateCreatedCategories()

    let allEvents = []
    let unwrapEvents = (tree) => {
      if (tree.category_id !== undefined) {
        let expand = (e) => Object.assign({}, e, { category_id: tree.category_id })
        allEvents.push(...(tree.events.map(expand)))
        allEvents.push(...(tree.ranges.map(expand)))
      }
      tree.children.forEach(unwrapEvents)
    }
    unwrapEvents(data)
    let updateCreatedEntries = async (i) => {
      importObj.props.imported_entries = i
      await db('import')
        .update('imported_entries', i)
        .where('id', importObj.id)
    }
    
    for (let i = 0; i < allEvents.length; i++) {
      if (i % 10 === 0) {
        await updateCreatedEntries(i)
      }

      let data = allEvents[i]
      let isEvent = data.ended_at === undefined

      let entry = new Entry()
      entry.category = data.category_id
      entry.type = isEvent ? Type.Entry.EVENT : Type.Entry.RANGE
      entry.startedAt = data.started_at
      entry.startedAtTimezone = data.started_at_timezone
      if (!isEvent) {
        entry.endedAt = data.ended_at
        entry.endedAtTimezone = data.ended_at_timezone
      }
      await entry.save()
    }
    await updateCreatedEntries(allEvents.length)

    await db('import').update('success', true).where('id', importObj.id)
    importObj.props.success = true
  } catch (err) {
    console.log("Failure in importing data", err)
  }

  try {
    let db = require('../lib/db')()
    await db('import').update('complete', true).where('id', importObj.id)
    importObj.props.complete = true
  } catch (err) {
    // No action to take --> prevents node exiting from uncaught promise
  }
}

module.exports = class Import {
  constructor(data = {}) {
    this.id = data.id
    this.props = {
      created_at: data.created_at,
      updated_at: data.updated_at,

      user_id: data.user_id,
    
      expected_categories: data.expected_categories || 0,
      imported_categories: data.imported_categories || 0,

      expected_entries: data.expected_entries || 0,
      imported_entries: data.imported_entries || 0,

      complete: data.complete || false,
      success: data.success || false
    }
  }

  get userID() {
    return this.props.user_id
  }
  get createdAt() {
    return dateHelper.fromDb(this.props.created_at)
  }
  get updatedAt() {
    return dateHelper.fromDb(this.props.updated_at)
  }
  get expectedCategories() {
    return this.props.expected_categories
  }
  get importedCategories() {
    return this.props.imported_categories
  }
  get expectedEntries() {
    return this.props.expected_entries
  }
  get importedEntries() {
    return this.props.imported_entries
  }
  get complete() {
    return this.props.complete === true
  }
  get success() {
    return this.props.success === true
  }

  save() {
    let neverSaved = this.id == null

    if (!neverSaved) {
      throw TimeError.Request.INVALID_ACTION
    }

    return insertRecord.bind(this)()
  }

  static async fetch(id) {
    let objectData = await fetchRecords({ id }, 1)
    if (objectData.length == 0) {
      return Promise.reject(TimeError.Data.NOT_FOUND)
    }
    return new Import(objectData[0])
  }

  static async findForUser(user) {
    let id = typeof user === "number" ? user : user.id
    let objectData = await fetchRecords({ user_id: id })

    return objectData.map(importRequest => new Import(importRequest))
  }

  static async loadInto(user, data = {}) {
    let validFormat = Import.getRequestSchema().validate(data).error === undefined
    if (!validFormat) { throw TimeError.Data.INCORRECT_FORMAT }
    
    let validNaming = validateNames(data)
    if (!validNaming) { throw TimeError.Data.INCORRECT_FORMAT }

    // Record tracking
    let userID = (typeof user === "number") ? user : user.id    
    let counts = countAll(data)
    let createRootCategory = data.name.length !== 0
    if (!createRootCategory) { counts.categories-- }

    let newImport = new Import({
      user_id: userID,
      expected_categories: counts.categories,
      expected_entries: counts.entries
    })
    await newImport.save()
    
    // Can not throw, async import data in background on main process.
    // Queueing on different worker would require copy of data on disk. 
    performImport(newImport, data)

    return newImport
  }

  static getRequestSchema() {
    return joi.object().keys({
      name: joi.string().required().allow(''),
      events: joi.array().items(joi.object({
        started_at: joi.string().isoDate().required(),
        started_at_timezone: joi.string().required()
      })).required().min(0),
      ranges: joi.array().items(joi.object({
        started_at: joi.string().isoDate().required(),
        started_at_timezone: joi.string().required(),
        ended_at: joi.string().isoDate().required(),
        ended_at_timezone: joi.string().required()
      })).required().min(0),
      children: joi.array().items(joi.link('#tree')).required().min(0)
    }).id("tree")
  }
}