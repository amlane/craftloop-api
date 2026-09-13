const db = require("../data/dbConfig.js");

module.exports = {
  find,
  findBy,
  findById,
  add,
  update,
  remove,
};

function find() {
  return db("patterns").select("*");
}

function findBy(filter) {
  return db("patterns").where(filter);
}

function findById(id) {
  return db("patterns").where({ id }).select("*").first();
}

async function add(pattern) {
  const [inserted] = await db("patterns").insert(pattern).returning("id");
  const id = typeof inserted === "object" ? inserted.id : inserted;

  return findById(id);
}

async function update(id, changes) {
  await db("patterns").where({ id }).update(changes);

  return findById(id);
}

function remove(id) {
  return db("patterns").where({ id }).del();
}
