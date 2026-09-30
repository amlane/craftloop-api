/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 *
 * Data Schema
 		title: STRING,
		status: ENUM ('draft', 'tested', 'done')
		gauge: STRING,
		finishedSize: STRING,
		tags: JSON array of strings, stored as a json column (dedupe handled in the model layer, not the DB)
		sections: JSON array of { id, name, type, entries: [{ id, label, instructions, count }] }, stored as a json column
		notes: '', String, long text input
		photos: see pattern_photos table (separate migration) - has its own lifecycle (upload/delete from a bucket), so it isn't inline JSON here
		yarns: see pattern_yarns table (separate migration) - a pattern can use more than one yarn/colorway
		supplies: see pattern_supplies table (separate migration) - hook, yarn needle, scissors, etc.

        createdAt / updatedAt: added via patterns.timestamps(true, true, true) below.
        Note: SQLite won't auto-touch updatedAt on UPDATE - set it explicitly
        (updatedAt: knex.fn.now()) in the model's update calls.
 */
exports.up = function (knex) {
  return knex.schema.createTable("patterns", (patterns) => {
    patterns.increments(); // primary key

    patterns.string("title", 128).notNullable().defaultTo("Untitled Pattern");

    patterns
      .enum("status", ["draft", "tested", "done"])
      .notNullable()
      .defaultTo("draft");

    patterns.string("gauge", 128);
    patterns.string("finishedSize", 128);
    patterns.string("notes", 3000);

    // .jsonb(...) vs .json(...): Postgres jsonb allows you to query or index into these columns
    patterns.jsonb("tags").notNullable().defaultTo("[]");
    patterns.jsonb("sections").notNullable().defaultTo("[]");

    patterns
      .integer("user_id")
      .notNullable()
      .unsigned()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    patterns.timestamps(true, true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists("patterns");
};
