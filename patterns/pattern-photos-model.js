const db = require("../data/dbConfig.js");

module.exports = {
  findByPatternId,
  findById,
  add,
  updateCaption,
  remove,
};

function findByPatternId(patternId) {
  return db("pattern_photos")
    .where({ pattern_id: patternId })
    .orderBy("position");
}

function findById(id) {
  return db("pattern_photos").where({ id }).first();
}

async function add({ patternId, url, publicId, caption }) {
  const [{ position }] = await db("pattern_photos")
    .where({ pattern_id: patternId })
    .max("position as position");
  const nextPosition = position === null ? 0 : position + 1;

  const [inserted] = await db("pattern_photos")
    .insert({
      pattern_id: patternId,
      url,
      public_id: publicId,
      caption: caption ?? null,
      position: nextPosition,
    })
    .returning("id");
  const id = typeof inserted === "object" ? inserted.id : inserted;

  return findById(id);
}

async function updateCaption(id, caption) {
  await db("pattern_photos")
    .where({ id })
    .update({ caption, updatedAt: db.fn.now() });

  return findById(id);
}

function remove(id) {
  return db("pattern_photos").where({ id }).del();
}
