const { z } = require("zod");

const updateRoleSchema = z.object({
  role: z.enum(["user", "admin"]),
});

module.exports = { updateRoleSchema };
