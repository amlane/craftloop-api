const db = require("../data/dbConfig.js");

module.exports = {
  replaceForPattern,
};

// Full replace rather than a diff/merge - matches how the frontend already
// round-trips the whole pattern on every save (see pattern/[id]/+page.svelte).
async function replaceForPattern(patternId, supplies, trx) {
  const query = trx || db;

  await query("pattern_supplies").where({ pattern_id: patternId }).del();

  if (!supplies || !supplies.length) return;

  const rows = supplies.map((supply, index) => ({
    pattern_id: patternId,
    supply_type: supply.supply_type,
    detail: supply.detail ?? null,
    position: index,
  }));

  await query("pattern_supplies").insert(rows);
}
