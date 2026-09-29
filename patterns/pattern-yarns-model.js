const db = require("../data/dbConfig.js");

module.exports = {
  replaceForPattern,
};

// Full replace rather than a diff/merge - matches how the frontend already
// round-trips the whole pattern on every save (see pattern/[id]/+page.svelte).
async function replaceForPattern(patternId, yarns, trx) {
  const query = trx || db;

  await query("pattern_yarns").where({ pattern_id: patternId }).del();

  if (!yarns || !yarns.length) return;

  const rows = yarns.map((yarn, index) => ({
    pattern_id: patternId,
    colorway: yarn.colorway ?? null,
    brand: yarn.brand ?? null,
    weight: yarn.weight ?? null,
    position: index,
  }));

  await query("pattern_yarns").insert(rows);
}
