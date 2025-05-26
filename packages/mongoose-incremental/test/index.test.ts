import CI from 'ci-info'
import mongoose from 'mongoose'
import { initialize, plugin } from '@/index'

describe.skipIf(CI.isCI)('index', () => {
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
    console.log(silence.name) // 'Silence'
    const fluffy = new Kitten({ name: 'fluffy' })
    await fluffy.save()
    fluffy.speak() // "Meow name is fluffy"
  })
})
