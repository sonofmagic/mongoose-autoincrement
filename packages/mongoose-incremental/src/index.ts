import type { Model, Mongoose, MongooseError, Schema } from 'mongoose'
import { defu } from 'defu'

let counterSchema: Schema<RawDocType>

export interface RawDocType {
  model: string
  field: string
  count?: number
}

export type IdentityCounterModel = Model<RawDocType, unknown, unknown, unknown, any, any>

let IdentityCounter: IdentityCounterModel

let mongoose: Mongoose

export const DEFAULT_MODEL_NAME = 'IdentityCounter'

// Initialize plugin by creating counter collection in database.
function initialize(mongooseRef: Mongoose) {
  mongoose = mongooseRef
  try {
    IdentityCounter = mongoose.model(DEFAULT_MODEL_NAME)
  }
  catch (ex) {
    if ((ex as MongooseError).name === 'MissingSchemaError') {
      // Create new counter schema.
      counterSchema = new mongoose.Schema<RawDocType>({
        model: { type: String, require: true },
        field: { type: String, require: true },
        count: { type: Number, default: 0 },
      })

      // Create a unique index using the "field" and "model" fields.
      counterSchema.index({ field: 1, model: 1 }, {
        unique: true,
      })

      // Create model using new schema.
      IdentityCounter = mongoose.model<RawDocType>(DEFAULT_MODEL_NAME, counterSchema)
    }
    else {
      throw ex
    }
  }
}

export interface UserDefinedOptions {
  model: string
  field?: string
  startAt?: number
  incrementBy?: number
  unique?: boolean
  forceSync?: boolean
}

// The function to use when invoking the plugin on a custom schema.
function plugin(schema: Schema, options: UserDefinedOptions) {
  // If we don't have reference to the counterSchema or the IdentityCounter model then the plugin was most likely not
  // initialized properly so throw an error.
  if (!counterSchema || !IdentityCounter) {
    throw new Error('mongoose-incremental has not been initialized')
  }

  // Default settings and plugin scope variables.
  const settings = defu<Required<UserDefinedOptions>, Partial<UserDefinedOptions>[]>(options, {
    // model: null, // The model to configure the plugin for.
    field: '_id', // The field the plugin should track.
    startAt: 0, // The number the count should start at.
    incrementBy: 1, // The number by which to increment the count each time.
    unique: true, // Should we create a unique index for the field
    forceSync: false, // Should we force sync the counter collection with the documents in the database.
  })
  const fields: Record<string, any> = {} // A hash of fields to add properties to in Mongoose.
  let ready = false // True if the counter collection has been updated and the document is ready to be saved.

  if (settings.model === undefined) {
    throw new Error('model must be set')
  }

  // Add properties for field in schema.
  fields[settings.field] = {
    type: Number,
    require: true,
  }
  if (settings.field !== '_id') {
    fields[settings.field].unique = settings.unique
  }
  schema.add(fields)

  // Find the counter for this model and the relevant field.
  const initPromise = IdentityCounter.find(
    { model: settings.model, field: settings.field },
  ).then((counters) => {
    if (counters.length === 0) {
    // If no counter exists then create one and save it.
      const count = settings.startAt - settings.incrementBy
      const counter = new IdentityCounter({ model: settings.model, field: settings.field, count })
      return counter.save().then(() => {
        ready = true
      })
    }
    else {
      // if (counters.length === 1) {
      //   const hit: IdentityCounterModel = counters[0]
      //   if (settings.forceSync) {

      //   }
      // }
      // else if (counters.length > 1) {
      //   if (settings.forceSync) {

      //   }
      // }
      ready = true
    }
  })

  // Declare a function to get the next counter for the model/schema.
  async function nextCount() {
    const counter = await IdentityCounter.findOne({
      model: settings.model,
      field: settings.field,
    })
    if (counter === null) {
      return settings.startAt
    }
    else {
      return counter.count + settings.incrementBy
    }
  }
  schema.method('nextCount', nextCount)
  schema.static('nextCount', nextCount)

  // Declare a function to reset counter at the start value - increment value.
  async function resetCount() {
    await IdentityCounter.findOneAndUpdate(
      { model: settings.model, field: settings.field },
      { count: settings.startAt - settings.incrementBy },
      { new: true }, // new: true specifies that the callback should get the updated counter.
    )
    return settings.startAt
  }
  // Add nextCount as both a method on documents and a static on the schema for convenience.
  schema.method('resetCount', resetCount)
  schema.static('resetCount', resetCount)

  // Every time documents in this schema are saved, run this logic.
  schema.pre('save', async function (next, _opts) {
    // Get reference to the document being saved.
    await initPromise
    // Only do this if it is a new document (see http://mongoosejs.com/docs/api.html#document_Document-isNew)
    if (this.isNew) {
      const save = async () => {
        // If ready, run increment logic.
        // Note: ready is true when an existing counter collection is found or after it is created for the
        // first time.
        if (ready) {
          // check that a number has already been provided, and update the counter to that number if it is
          // greater than the current count
          if (typeof this[settings.field] === 'number') {
            try {
              await IdentityCounter.findOneAndUpdate(
              // IdentityCounter documents are identified by the model and field that the plugin was invoked for.
              // Check also that count is less than field value.
                { model: settings.model, field: settings.field, count: { $lt: this[settings.field] } },
                // Change the count of the value found to the new field value.
                { count: this[settings.field] },
              )
              return next()
            }
            catch (err) {
              return next(err as MongooseError)
            }
          }
          else {
            try {
              // Find the counter collection entry for this model and field and update it.
              const updatedIdentityCounter = await IdentityCounter.findOneAndUpdate(
              // IdentityCounter documents are identified by the model and field that the plugin was invoked for.
                { model: settings.model, field: settings.field },
                // Increment the count by `incrementBy`.
                { $inc: { count: settings.incrementBy } },
                // new:true specifies that the callback should get the counter AFTER it is updated (incremented).
                { new: true },
              )
              // If there are no errors then go ahead and set the document's field to the current count.
              this[settings.field] = updatedIdentityCounter.count
              // Continue with default document save functionality.
              return next()
            }
            catch (err) {
              return next(err as MongooseError)
            }
          }
        }
        // If not ready then set a 5 millisecond timer and try to save again. It will keep doing this until
        // the counter collection is ready.
        else {
          setTimeout(save, 5)
        }
      }
      await save()
    }
    // If the document does not have the field we're interested in or that field isn't a number AND the user did
    // not specify that we should increment on updates, then just continue the save without any increment logic.
    else {
      next()
    }
  })
}

function getState() {
  return {
    mongoose,
    IdentityCounter,
    counterSchema,
  }
}

export {
  getState,
  initialize,
  plugin,
}
