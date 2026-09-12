const db = require("../data/dbConfig.js");

module.exports = {
  add,
  findById,
};

async function add(pattern) {
  const [inserted] = await db("patterns").insert(pattern).returning("id");
  const id = typeof inserted === "object" ? inserted.id : inserted;

  return findById(id);
}

function findById(id) {
  return db("patterns").where({ id }).select("*").first();
}
