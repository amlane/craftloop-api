/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 *
 * Data Schema
 *   pattern_id: FK -> patterns.id, cascades on delete so a pattern's photo
 *     rows go away with it (the underlying Cloudinary asset is deleted by
 *     the router before the row is - the FK only cleans up the DB row)
 *   url: STRING - the Cloudinary secure_url for the uploaded image
 *   public_id: STRING - the Cloudinary public ID, needed to delete/manage
 *     the asset via the Cloudinary API
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
    photos.string("public_id", 255).notNullable();
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
