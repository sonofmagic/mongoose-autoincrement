# mongoose-incremental

A lightweight and flexible Mongoose plugin to auto-increment numeric fields in your MongoDB models. Useful for sequential IDs or counters with custom settings.

## Features

- Auto-increment fields (including `_id` or any custom field)
- Supports multiple models and fields
- Customizable starting value and increment step
- Optional uniqueness enforcement on fields
- Utility methods: `nextCount`, `resetCount`

## Installation

```bash
npm install mongoose-incremental
```

or

```bash
yarn add mongoose-incremental
```

## Usage

### 1. Initialize Plugin

Before applying the plugin, you must initialize it with a Mongoose instance.

```ts
import mongoose from 'mongoose'
import { initialize } from 'mongoose-incremental'

initialize(mongoose)
```

If you're using a custom connection:

```ts
initialize(mongoose, customConnection)
```

---

### 2. Configure Plugin

Use `createPlugin()` to configure and generate a plugin for your specific model and field.

```ts
import { createPlugin } from 'mongoose-incremental'

const plugin = await createPlugin({
  model: 'User', // Required: Name of the model
  field: 'userId', // Optional: Field to auto-increment (default: _id)
  startAt: 1000, // Optional: Starting value (default: 0)
  incrementBy: 10, // Optional: Increment step (default: 1)
  unique: true // Optional: Enforce unique index (default: true)
})
```

---

### 3. Apply Plugin to Schema

Apply the plugin to your schema:

```ts
import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: String,
})

userSchema.plugin(plugin)

const User = mongoose.model('User', userSchema)
```

---

## Example

```ts
import mongoose from 'mongoose'
import { createPlugin, initialize } from 'mongoose-incremental'

await mongoose.connect('mongodb://localhost/test')

initialize(mongoose)

const plugin = await createPlugin({
  model: 'Customer',
  field: 'customerNumber',
  startAt: 1000,
})

const customerSchema = new mongoose.Schema({
  name: String,
})

customerSchema.plugin(plugin)

const Customer = mongoose.model('Customer', customerSchema)

const customer = await Customer.create({ name: 'John Doe' })
console.log(customer.customerNumber) // 1000
```

---

## API

### `initialize(mongoose: Mongoose, connection?: Connection)`

Initializes the plugin with a mongoose instance. Must be called before `createPlugin`.

### `createPlugin(options: UserDefinedOptions) => Promise<PluginFunction>`

Creates a plugin with your configuration.

#### `UserDefinedOptions`:

| Option        | Type    | Default | Description                   |
| ------------- | ------- | ------- | ----------------------------- |
| `model`       | string  | —       | Model name to track           |
| `field`       | string  | `_id`   | Field to auto-increment       |
| `startAt`     | number  | `0`     | Starting number               |
| `incrementBy` | number  | `1`     | Step increment                |
| `unique`      | boolean | `true`  | Add unique index on the field |

---

## Schema Methods

- `doc.nextCount(): Promise<number>`
  Returns the next counter value (does not increment).

- `doc.resetCount(): Promise<number>`
  Resets the counter to `startAt - incrementBy`.

## Static Methods

- `Model.nextCount(): Promise<number>`
  Same as above, on model.

- `Model.resetCount(): Promise<number>`
  Same as above, on model.

---

## Internal State (Debugging)

You can access internal plugin state via:

```ts
import { getState } from 'mongoose-incremental'

const state = getState()
console.log(state.mongoose)
console.log(state.IdentityCounter)
console.log(state.counterSchema)
console.log(state.connection)
```

---

## License

MIT
