/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Deletes ALL existing entries (cascades to pattern_yarns/pattern_supplies/pattern_photos)
  await knex.raw("TRUNCATE TABLE patterns RESTART IDENTITY CASCADE");

  const [inserted] = await knex("patterns")
    .insert({
      title: "Seed Pattern 1",
      status: "draft",
      gauge: "4 rows of dc = 4 inches",
      finishedSize: "21 inches x 42 inches",
      tags: '["accessories", "fashion", "scarf"]',
      sections: "[]",
      notes: "This is seed data.",
      user_id: 1,
    })
    .returning("id");
  const patternId = typeof inserted === "object" ? inserted.id : inserted;

  await knex("pattern_yarns").insert({
    pattern_id: patternId,
    brand: "I Love This Yarn",
    colorway: "Navy Blue",
    weight: "Bulky (5)",
    position: 0,
  });

  await knex("pattern_supplies").insert({
    pattern_id: patternId,
    supply_type: "hook",
    detail: "I/9 (6.0mm)",
    position: 0,
  });
};
