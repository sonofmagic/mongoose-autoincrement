# mongoose-autoincrement

`mongoose-autoincrement` is a Mongoose plugin that enables auto-incrementing numeric fields in your MongoDB documents. It’s particularly useful for custom ID generation or maintaining ordered values.

## Features

- Auto-increments a numeric field on document creation
- Customizable starting value and increment step
- Supports counter reset
- Enforces uniqueness via indexes

## Installation

```bash
npm install mongoose-autoincrement
```

## Initialization

Before using the plugin, you **must initialize** it with your Mongoose instance:

```ts
import mongoose from 'mongoose'
import { initialize } from 'mongoose-autoincrement'

initialize(mongoose)
```

This creates or accesses the internal `IdentityCounter` collection used for tracking counters.

## Usage

To apply the plugin to a Mongoose schema:

```ts
import { model, Schema } from 'mongoose'
import { plugin } from 'mongoose-autoincrement'

const bookSchema = new Schema({
  title: String,
  author: String,
})

// Apply the plugin
plugin(bookSchema, {
  model: 'Book', // Required: The target model name
  field: 'bookId', // Optional: Auto-incremented field (default: "_id")
  startAt: 100, // Optional: Start value (default: 0)
  incrementBy: 1, // Optional: Step value (default: 1)
  unique: true, // Optional: Unique index enforcement (default: true)
})

const Book = model('Book', bookSchema)
```

## Plugin Options

| Option        | Type      | Default | Description                                |
| ------------- | --------- | ------- | ------------------------------------------ |
| `model`       | `string`  | —       | Target model name (required)               |
| `field`       | `string`  | `_id`   | The field to auto-increment                |
| `startAt`     | `number`  | `0`     | Starting number                            |
| `incrementBy` | `number`  | `1`     | Increment step                             |
| `unique`      | `boolean` | `true`  | Whether to create a unique index for field |

## Schema Methods

The plugin adds the following methods to your schema:

### `nextCount()`

Returns the next value of the counter.

```ts
const next = await Book.nextCount()
console.log(next) // e.g., 101
```

### `resetCount()`

Resets the counter back to `startAt - incrementBy`.

```ts
await Book.resetCount()
```

## Behavior

- The counter is only incremented on new document creation.
- If a value is manually assigned and is higher than the current count, the counter is updated to that value.
- The counter data is stored in a collection called `IdentityCounter`.

## Notes

- Always call `initialize(mongoose)` **before** applying the plugin.
- If you skip initialization, the plugin will throw an error.

## License

MIT
