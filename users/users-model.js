const db = require("../data/dbConfig.js");
const Patterns = require("../patterns/patterns-model.js");

module.exports = {
  add,
  find,
  findBy,
  findById,
  getPatternsByUserId,
  updateRole,
  updatePassword,
  remove,
};

// Admin-only listing (see requireAdmin on GET /) — never expose the
// password hash.
function find() {
  return db("users").select("id", "username", "email", "role");
}

// Used for auth; returns the full row including the password hash.
function findBy(filter) {
  return db("users").where(filter);
}

async function add(user) {
  const [inserted] = await db("users").insert(user).returning("id");
  const id = typeof inserted === "object" ? inserted.id : inserted;

  return findById(id);
}

function findById(id) {
  return db("users")
    .where({ id })
    .select("id", "username", "email", "role")
    .first();
}

async function getPatternsByUserId(id) {
  const patterns = await db("patterns").where({ user_id: id });
  return Patterns.attachChildren(patterns);
}

async function updateRole(id, role) {
  await db("users").where({ id }).update({ role });
  return findById(id);
}

async function updatePassword(id, passwordHash) {
  await db("users").where({ id }).update({ password: passwordHash });
}

function remove(id) {
  // patterns (and their yarns/supplies/photos) cascade-delete with the user
  return db("users").where({ id }).del();
}
