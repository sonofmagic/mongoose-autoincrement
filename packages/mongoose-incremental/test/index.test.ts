import CI from 'ci-info'
import mongoose from 'mongoose'
import { getState, initialize, plugin } from '@/index'

describe.skipIf(CI.isCI).sequential('index', () => {
  beforeAll(async () => {
    await mongoose.connect('mongodb://127.0.0.1:27018/test')
    await initialize(mongoose)
  })
  it('kittySchema case 0', async () => {
    const kittySchema = new mongoose.Schema({
      name: String,
    }, {
      methods: {
        speak() {
          const greeting = this.name
            ? `Meow name is ${this.name}`
            : 'I don\'t have a name'
          console.log(greeting)
        },
      },
    })
    kittySchema.plugin(plugin, {
      model: 'Kitten',
    })

    const Kitten = mongoose.model('Kitten', kittySchema)
    const silence = new Kitten({ name: 'Silence' })
    await silence.save()
    const fluffy = new Kitten({ name: 'fluffy' })
    await fluffy.save()
    fluffy.speak() // "Meow name is fluffy"
    expect(silence._id).toBe(0)
    expect(fluffy._id).toBe(1)
    const counts = await Kitten.countDocuments()
    expect(counts).toBe(2)
    const { IdentityCounter } = getState()
    const identityCounts = await IdentityCounter.countDocuments()
    expect(identityCounts).toBe(1)
    const identityCounter = await IdentityCounter.findOne({ model: 'Kitten', field: '_id' })
    expect(identityCounter).toBeDefined()
    expect(identityCounter.count).toBe(1)
  })

  afterEach(() => {
    mongoose.connection.db?.dropCollection('identitycounters')
    mongoose.connection.db?.dropCollection('kittens')
  })
})
