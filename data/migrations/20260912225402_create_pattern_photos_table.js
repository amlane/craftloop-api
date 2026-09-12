/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 *
 * Data Schema
 *   pattern_id: FK -> patterns.id, cascades on delete so a pattern's photo
 *     rows go away with it (still need to delete the underlying bucket
 *     objects yourself before/after this - the FK only cleans up the DB row)
 *   url: STRING - wherever the photo actually lives (bucket URL/key). Kept
 *     generic since the storage backend isn't decided yet.
 *   caption: STRING, optional
 *   position: INTEGER - display order within the pattern (matches the
 *     array order the frontend already works with)
 */
exports.up = function (knex) {
  return knex.schema.createTable("pattern_photos", (photos) => {
    photos.increments(); // primary key

    photos
      .integer("pattern_id")
      .notNullable()
      .unsigned()
      .references("id")
      .inTable("patterns")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    photos.string("url", 500).notNullable();
    photos.string("caption", 255);
    photos.integer("position").notNullable().defaultTo(0);

    photos.timestamps(true, true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists("pattern_photos");
};
