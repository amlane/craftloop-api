/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Deletes ALL existing entries
  await knex("patterns").del();
  await knex("patterns").insert([
    {
      title: "Seed Pattern 1",
      status: "draft",
      yarnBrand: "I Love This Yarn",
      yarnColorway: "Navy Blue",
      yarnWeight: "Bulky (5)",
      hook: "I/9 (6.0mm)",
      gauge: "4 rows of dc = 4 inches",
      finishedSize: "21 inches x 42 inches",
      tags: JSON.stringify(["accessories", "fashion", "scarf"]),
      sections: JSON.stringify([]),
      notes: "This is seed data.",
      user_id: 1,
    },
  ]);
};
