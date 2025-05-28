import type { Model } from 'mongoose'
import CI from 'ci-info'
import { get } from 'es-toolkit/compat'
import { MongoServerError } from 'mongodb'
import mongoose, { connect, model, Schema } from 'mongoose'
import { createPlugin, getState, initialize } from '@/index'

const DEFAULT_MODEL_NAME = 'Kitten'

async function reset() {
  if (DEFAULT_MODEL_NAME in mongoose.models) {
    mongoose.deleteModel(DEFAULT_MODEL_NAME)
  }
  await mongoose.connection.db?.dropCollection('identitycounters')
  await mongoose.connection.db?.dropCollection('kittens')
}

interface IKitty {
  name: string
}

describe.skipIf(CI.isCI).sequential('index', () => {
  beforeAll(async () => {
    await connect('mongodb://127.0.0.1:27018/test')
  })
  let kittySchema: Schema<IKitty>
  let Kitten: Model<IKitty>
  beforeEach(async () => {
    await reset()
    await initialize(mongoose)
    kittySchema = new Schema<IKitty>({
      name: String,
    })
  })

  it('kittySchema case 0', async () => {
    kittySchema.plugin(await createPlugin({
      model: DEFAULT_MODEL_NAME,
    }))
    Kitten = model<IKitty>(DEFAULT_MODEL_NAME, kittySchema)
    const silence = new Kitten({ name: 'Silence' })
    await silence.save()
    const fluffy = new Kitten({ name: 'fluffy' })
    await fluffy.save()
    expect(silence._id).toBe(0)
    expect(fluffy._id).toBe(1)
    const counts = await Kitten.countDocuments()
    expect(counts).toBe(2)
    const { IdentityCounter } = getState()
    const identityCounts = await IdentityCounter.countDocuments()
    expect(identityCounts).toBe(1)
    const identityCounter = await IdentityCounter.findOne({ model: DEFAULT_MODEL_NAME, field: '_id' })
    expect(identityCounter).toBeDefined()
    expect(identityCounter?.count).toBe(1)
  })

  it('kittySchema case 1', async () => {
    kittySchema.plugin(await createPlugin({
      model: DEFAULT_MODEL_NAME,
      startAt: 100,
      incrementBy: 2,
    }))

    Kitten = model<IKitty>(DEFAULT_MODEL_NAME, kittySchema)
    const silence = new Kitten({ name: 'Silence' })
    await silence.save()
    const fluffy = new Kitten({ name: 'fluffy' })
    await fluffy.save()
    expect(silence._id).toBe(100)
    expect(fluffy._id).toBe(102)
    const counts = await Kitten.countDocuments()
    expect(counts).toBe(2)
    const { IdentityCounter } = getState()
    const identityCounts = await IdentityCounter.countDocuments()
    expect(identityCounts).toBe(1)
    const identityCounter = await IdentityCounter.findOne({ model: DEFAULT_MODEL_NAME, field: '_id' })
    expect(identityCounter).toBeDefined()
    expect(identityCounter?.count).toBe(102)
  })

  it('kittySchema case 2', async () => {
    const customField = 'seq'
    kittySchema.plugin(await createPlugin({
      model: DEFAULT_MODEL_NAME,
      startAt: 100,
      incrementBy: 2,
      field: customField,
    }))
    Kitten = model<IKitty>(DEFAULT_MODEL_NAME, kittySchema)
    const silence = new Kitten({ name: 'Silence' })
    await silence.save()
    const fluffy = new Kitten({ name: 'fluffy' })
    await fluffy.save()
    expect(get(silence, customField)).toBe(100)
    expect(get(fluffy, customField)).toBe(102)
    const counts = await Kitten.countDocuments()
    expect(counts).toBe(2)
    const { IdentityCounter } = getState()
    const identityCounts = await IdentityCounter.countDocuments()
    expect(identityCounts).toBe(1)
    const identityCounter = await IdentityCounter.findOne({ model: DEFAULT_MODEL_NAME, field: customField })
    expect(identityCounter).toBeDefined()
    expect(identityCounter?.count).toBe(102)
  })

  it('kittySchema case 3', async () => {
    const customField = 'seq'
    kittySchema.plugin(await createPlugin({
      model: DEFAULT_MODEL_NAME,
      startAt: 100,
      incrementBy: 2,
      field: customField,
      unique: false,
    }))
    Kitten = model<IKitty>(DEFAULT_MODEL_NAME, kittySchema)
    const silence = new Kitten({ name: 'Silence' })
    await silence.save()
    const fluffy = new Kitten({ name: 'fluffy' })
    await fluffy.save()
    expect(get(silence, customField)).toBe(100)
    expect(get(fluffy, customField)).toBe(102)
    const fluffy2 = new Kitten({ name: 'fluffy2', seq: 102 })
    await fluffy2.save()
    const counts = await Kitten.countDocuments()
    expect(counts).toBe(3)
    const { IdentityCounter } = getState()
    const identityCounts = await IdentityCounter.countDocuments()
    expect(identityCounts).toBe(1)
    const identityCounter = await IdentityCounter.findOne({ model: DEFAULT_MODEL_NAME, field: customField })
    expect(identityCounter).toBeDefined()
    expect(identityCounter?.count).toBe(102)
  })

  it('kittySchema case 4', async () => {
    const customField = '_id'
    kittySchema.plugin(await createPlugin({
      model: DEFAULT_MODEL_NAME,
      startAt: 100,
      incrementBy: 2,
      field: customField,
      unique: false,
    }))
    Kitten = model<IKitty>(DEFAULT_MODEL_NAME, kittySchema)
    const silence = new Kitten({ name: 'Silence' })
    await silence.save()
    const fluffy = new Kitten({ name: 'fluffy' })
    await fluffy.save()
    expect(get(silence, customField)).toBe(100)
    expect(get(fluffy, customField)).toBe(102)
    const fluffy2 = new Kitten({ name: 'fluffy2', _id: 102 })
    try {
      await fluffy2.save()
    }
    catch (error) {
      expect(error).toBeInstanceOf(MongoServerError)
    }

    const counts = await Kitten.countDocuments()
    expect(counts).toBe(2)
    const { IdentityCounter } = getState()
    const identityCounts = await IdentityCounter.countDocuments()
    expect(identityCounts).toBe(1)
    const identityCounter = await IdentityCounter.findOne({ model: DEFAULT_MODEL_NAME, field: customField })
    expect(identityCounter).toBeDefined()
    expect(identityCounter?.count).toBe(102)
  })

  it('kittySchema case 5', async () => {
    const { IdentityCounter } = getState()
    const customField = '_id'
    const x = new IdentityCounter({
      count: 10000,
      field: customField,
      model: DEFAULT_MODEL_NAME,
    })
    await x.save()

    kittySchema.plugin(await createPlugin({
      model: DEFAULT_MODEL_NAME,
      startAt: 100,
      incrementBy: 2,
      field: customField,
    }))
    Kitten = model<IKitty>(DEFAULT_MODEL_NAME, kittySchema)
    const silence = new Kitten({ name: 'Silence' })
    await silence.save()
    const fluffy = new Kitten({ name: 'fluffy' })
    await fluffy.save()

    expect(get(silence, customField)).toBe(10002)
    expect(get(fluffy, customField)).toBe(10004)

    const counts = await Kitten.countDocuments()
    expect(counts).toBe(2)

    const identityCounts = await IdentityCounter.countDocuments()
    expect(identityCounts).toBe(1)
    const identityCounter = await IdentityCounter.findOne({ model: DEFAULT_MODEL_NAME, field: customField })
    expect(identityCounter).toBeDefined()
    expect(identityCounter?.count).toBe(10004)
  })

  it('kittySchema case 6', async () => {
    const { IdentityCounter } = getState()
    const customField = '_id'

    kittySchema.plugin(await createPlugin({
      model: DEFAULT_MODEL_NAME,
      startAt: 100,
      incrementBy: 2,
      field: customField,
    }))
    Kitten = model<IKitty>(DEFAULT_MODEL_NAME, kittySchema)

    // const x = new IdentityCounter({
    //   count: 10000,
    //   field: customField,
    //   model: DEFAULT_MODEL_NAME,
    // })
    // await x.save()
    const silence = new Kitten({ name: 'Silence' })
    await silence.save()
    const fluffy = new Kitten({ name: 'fluffy' })
    await fluffy.save()

    expect(get(silence, customField)).toBe(100)
    expect(get(fluffy, customField)).toBe(102)

    const counts = await Kitten.countDocuments()
    expect(counts).toBe(2)

    const identityCounts = await IdentityCounter.countDocuments()
    expect(identityCounts).toBe(1)
    const identityCounter = await IdentityCounter.findOne({ model: DEFAULT_MODEL_NAME, field: customField })
    expect(identityCounter).toBeDefined()
    expect(identityCounter?.count).toBe(102)
  })

  it('kittySchema case 7', async () => {
    const { IdentityCounter } = getState()
    const customField = '_id'
    const x = new IdentityCounter({
      count: 10000,
      field: customField,
      model: DEFAULT_MODEL_NAME,
    })
    await x.save()

    kittySchema.plugin(await createPlugin({
      model: DEFAULT_MODEL_NAME,
      startAt: 100,
      incrementBy: 2,
      field: customField,
    }))
    Kitten = model<IKitty>(DEFAULT_MODEL_NAME, kittySchema)
    const silence = new Kitten({ name: 'Silence' })
    await silence.save()
    const fluffy = new Kitten({ name: 'fluffy' })
    await fluffy.save()

    expect(get(silence, customField)).toBe(10002)
    expect(get(fluffy, customField)).toBe(10004)

    const counts = await Kitten.countDocuments()
    expect(counts).toBe(2)

    const identityCounts = await IdentityCounter.countDocuments()
    expect(identityCounts).toBe(1)
    const identityCounter = await IdentityCounter.findOne({ model: DEFAULT_MODEL_NAME, field: customField })
    expect(identityCounter).toBeDefined()
    expect(identityCounter?.count).toBe(10004)
  })

  it('kittySchema case 8', async () => {
    const { IdentityCounter } = getState()
    const customField = '_id'

    kittySchema.plugin(await createPlugin({
      model: DEFAULT_MODEL_NAME,
      startAt: 100,
      incrementBy: 2,
      field: customField,
    }))
    Kitten = model<IKitty>(DEFAULT_MODEL_NAME, kittySchema)

    // const x = new IdentityCounter({
    //   count: 10000,
    //   field: customField,
    //   model: DEFAULT_MODEL_NAME,
    // })
    // await x.save()
    const silence = new Kitten({ name: 'Silence' })
    await silence.save()
    const fluffy = new Kitten({ name: 'fluffy' })
    await fluffy.save()

    expect(get(silence, customField)).toBe(100)
    expect(get(fluffy, customField)).toBe(102)

    const counts = await Kitten.countDocuments()
    expect(counts).toBe(2)

    const identityCounts = await IdentityCounter.countDocuments()
    expect(identityCounts).toBe(1)
    const identityCounter = await IdentityCounter.findOne({ model: DEFAULT_MODEL_NAME, field: customField })
    expect(identityCounter).toBeDefined()
    expect(identityCounter?.count).toBe(102)
  })

  it('kittySchema case 9', async () => {
    const { IdentityCounter } = getState()
    const customField = '_id'

    kittySchema.plugin(await createPlugin({
      model: DEFAULT_MODEL_NAME,
      startAt: 100,
      incrementBy: 2,
      field: customField,
    }))
    Kitten = model<IKitty>(DEFAULT_MODEL_NAME, kittySchema)

    const x = new IdentityCounter({
      count: 10000,
      field: customField,
      model: DEFAULT_MODEL_NAME,
    })
    try {
      await x.save()
    }
    catch (error) {
      console.error(error)
      expect(error).toBeDefined()
    }
    // let identityCounts = await IdentityCounter.countDocuments()
    // expect(identityCounts).toBe(1)
    const silence = new Kitten({ name: 'Silence' })
    await silence.save()
    const identityCounts = await IdentityCounter.countDocuments()
    expect(identityCounts).toBe(2)
  })

  afterEach(async () => {
    await reset()
  })
})
