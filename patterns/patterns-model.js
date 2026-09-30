const db = require("../data/dbConfig.js");
const PatternYarns = require("./pattern-yarns-model.js");
const PatternSupplies = require("./pattern-supplies-model.js");

module.exports = {
  find,
  findBy,
  findById,
  add,
  update,
  remove,
  attachChildren,
};

// Attaches `yarns` and `supplies` arrays onto one pattern or a list of
// patterns, batching the child-table reads instead of querying per pattern.
async function attachChildren(patterns) {
  const list = Array.isArray(patterns) ? patterns : [patterns];
  const ids = list.filter(Boolean).map((p) => p.id);
  if (!ids.length) return patterns;

  const [yarns, supplies, photos] = await Promise.all([
    db("pattern_yarns")
      .whereIn("pattern_id", ids)
      .orderBy(["pattern_id", "position"]),
    db("pattern_supplies")
      .whereIn("pattern_id", ids)
      .orderBy(["pattern_id", "position"]),
    db("pattern_photos")
      .whereIn("pattern_id", ids)
      .orderBy(["pattern_id", "position"]),
  ]);

  for (const pattern of list) {
    if (!pattern) continue;
    pattern.yarns = yarns.filter((y) => y.pattern_id === pattern.id);
    pattern.supplies = supplies.filter((s) => s.pattern_id === pattern.id);
    pattern.photos = photos.filter((p) => p.pattern_id === pattern.id);
  }

  return patterns;
}

async function find() {
  const patterns = await db("patterns").select("*");
  return attachChildren(patterns);
}

function findBy(filter) {
  return db("patterns").where(filter);
}

async function findById(id) {
  const pattern = await db("patterns").where({ id }).select("*").first();
  if (!pattern) return pattern;
  return attachChildren(pattern);
}

async function add(pattern) {
  const { yarns, supplies, ...patternFields } = pattern;

  const id = await db.transaction(async (trx) => {
    const [inserted] = await trx("patterns")
      .insert(patternFields)
      .returning("id");
    const newId = typeof inserted === "object" ? inserted.id : inserted;

    await PatternYarns.replaceForPattern(newId, yarns, trx);
    await PatternSupplies.replaceForPattern(newId, supplies, trx);

    return newId;
  });

  return findById(id);
}

async function update(id, changes) {
  const { yarns, supplies, ...patternFields } = changes;

  await db.transaction(async (trx) => {
    if (Object.keys(patternFields).length) {
      await trx("patterns").where({ id }).update(patternFields);
    }
    if (yarns !== undefined)
      await PatternYarns.replaceForPattern(id, yarns, trx);
    if (supplies !== undefined)
      await PatternSupplies.replaceForPattern(id, supplies, trx);
  });

  return findById(id);
}

function remove(id) {
  // pattern_yarns / pattern_supplies / pattern_photos all cascade on delete
  return db("patterns").where({ id }).del();
}
