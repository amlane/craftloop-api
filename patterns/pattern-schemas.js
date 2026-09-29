const { z } = require("zod");

const STATUSES = ["draft", "tested", "done"];

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

const idSchema = z.union([z.number(), z.string()]);

const yarnSchema = z.object({
  id: idSchema.optional(),
  colorway: z.string().trim().max(128).optional().nullable(),
  brand: z.string().trim().max(128).optional().nullable(),
  weight: z.enum(YARN_WEIGHTS).optional().nullable(),
});

const supplySchema = z.object({
  id: idSchema.optional(),
  supply_type: z.enum(SUPPLY_TYPES),
  detail: z.string().trim().max(128).optional().nullable(),
});

const entrySchema = z.object({
  id: idSchema.optional(),
  label: z.string().max(128).optional(),
  instructions: z.string().optional(),
  count: z.union([z.string(), z.number()]).optional(),
});

const sectionSchema = z.object({
  id: idSchema.optional(),
  name: z.string().max(128).optional(),
  type: z.string().optional(),
  entries: z.array(entrySchema).optional(),
});

// Photos aren't persisted yet (storage strategy undecided - see
// patterns-router.js), so this just guards against garbage payloads rather
// than fully modeling the eventual shape.
const photoSchema = z.object({}).passthrough();

// Shared by create and update - every field is optional so that both an
// empty-body create (defaults handled by the DB) and a partial update work.
const patternFields = {
  title: z.string().trim().max(128).optional(),
  status: z.enum(STATUSES).optional(),
  gauge: z.string().trim().max(128).optional().nullable(),
  finishedSize: z.string().trim().max(128).optional().nullable(),
  notes: z.string().max(3000).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(64)).optional(),
  sections: z.array(sectionSchema).optional(),
  yarns: z.array(yarnSchema).optional(),
  supplies: z.array(supplySchema).optional(),
  photos: z.array(photoSchema).optional(),
};

// z.object() strips unknown keys by default (no .strict()), so fields the
// client shouldn't be able to set directly - id, user_id, createdAt,
// updatedAt - are silently dropped even though the frontend round-trips the
// full pattern object it received from GET.
const createPatternSchema = z.object(patternFields);
const updatePatternSchema = z.object(patternFields);

module.exports = {
  createPatternSchema,
  updatePatternSchema,
  STATUSES,
  YARN_WEIGHTS,
  SUPPLY_TYPES,
};
