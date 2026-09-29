/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 *
 * Data Schema
 *   pattern_yarns - one row per yarn/colorway used in a pattern (a pattern
 *     can use more than one, e.g. a main color and a contrast color).
 *     pattern_id: FK -> patterns.id, cascades on delete
 *     colorway: STRING, optional, e.g. "Navy Blue"
 *     brand: STRING, optional, e.g. "I Love This Yarn"
 *     weight: ENUM, optional - same scale as the old patterns.yarnWeight column
 *     position: INTEGER - display order within the pattern
 *
 *   pattern_supplies - one row per supply/notion used in a pattern (hook,
 *     yarn needle, scissors, stitch markers, safety eyes, etc.). Replaces the
 *     old single patterns.hook column.
 *     pattern_id: FK -> patterns.id, cascades on delete
 *     supply_type: ENUM, one of a fixed set of supply categories
 *     detail: STRING, optional, e.g. "H-8 (5.0mm)" or "size 10 steel"
 *     position: INTEGER - display order within the pattern
 *
 *   Existing patterns.yarnBrand / yarnColorway / yarnWeight / hook data is
 *   migrated into the new tables below, then those columns are dropped.
 */

const YARN_WEIGHTS = [
  "Lace (0)",
  "Super Fine (1)",
  "Fine (2)",
  "Light (3)",
  "Medium / Worsted (4)",
  "Bulky (5)",
  "Super Bulky (6)",
  "Jumbo (7)",
];

const SUPPLY_TYPES = [
  "hook",
  "needle",
  "scissors",
  "stitch_markers",
  "safety_eyes",
  "pom_pom_maker",
  "stuffing",
  "other",
];

exports.up = async function (knex) {
  await knex.schema.createTable("pattern_yarns", (yarns) => {
    yarns.increments(); // primary key

    yarns
      .integer("pattern_id")
      .notNullable()
      .unsigned()
      .references("id")
      .inTable("patterns")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    yarns.string("colorway", 128);
    yarns.string("brand", 128);
    yarns.enum("weight", YARN_WEIGHTS);
    yarns.integer("position").notNullable().defaultTo(0);

    yarns.timestamps(true, true, true);
  });

  await knex.schema.createTable("pattern_supplies", (supplies) => {
    supplies.increments(); // primary key

    supplies
      .integer("pattern_id")
      .notNullable()
      .unsigned()
      .references("id")
      .inTable("patterns")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    supplies.enum("supply_type", SUPPLY_TYPES).notNullable().defaultTo("hook");
    supplies.string("detail", 128);
    supplies.integer("position").notNullable().defaultTo(0);

    supplies.timestamps(true, true, true);
  });

  const existingPatterns = await knex("patterns").select(
    "id",
    "yarnBrand",
    "yarnColorway",
    "yarnWeight",
    "hook",
  );

  const yarnRows = existingPatterns
    .filter((p) => p.yarnBrand || p.yarnColorway || p.yarnWeight)
    .map((p) => ({
      pattern_id: p.id,
      colorway: p.yarnColorway || null,
      brand: p.yarnBrand || null,
      weight: p.yarnWeight || null,
      position: 0,
    }));

  const supplyRows = existingPatterns
    .filter((p) => p.hook)
    .map((p) => ({
      pattern_id: p.id,
      supply_type: "hook",
      detail: p.hook,
      position: 0,
    }));

  if (yarnRows.length) await knex("pattern_yarns").insert(yarnRows);
  if (supplyRows.length) await knex("pattern_supplies").insert(supplyRows);

  await knex.schema.alterTable("patterns", (patterns) => {
    patterns.dropColumn("yarnBrand");
    patterns.dropColumn("yarnColorway");
    patterns.dropColumn("yarnWeight");
    patterns.dropColumn("hook");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable("patterns", (patterns) => {
    patterns.string("yarnBrand", 128);
    patterns.string("yarnColorway", 128);
    patterns.string("hook", 128);
    patterns
      .enum("yarnWeight", YARN_WEIGHTS)
      .notNullable()
      .defaultTo("Medium / Worsted (4)");
  });

  await knex.schema.dropTableIfExists("pattern_supplies");
  await knex.schema.dropTableIfExists("pattern_yarns");
};
